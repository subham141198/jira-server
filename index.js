const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
const auth = Buffer.from(`${process.env.JIRA_USERNAME}:${process.env.JIRA_API_TOKEN}`).toString('base64');

const getBoardsForProject = async (projectId) => {
  const apiUrl = `${process.env.JIRA_BASE_URL}/rest/agile/1.0/board?projectKeyOrId=${projectId}`;
  const response = await axios.get(apiUrl, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
  });

  if (response.status !== 200) {
    throw new Error('HTTP Error: ' + response.status);
  }

  return response.data.values;
};

const getSprintsForBoard = async (boardId) => {
  const apiUrl = `${process.env.JIRA_BASE_URL}/rest/agile/1.0/board/${boardId}/sprint`;
  const response = await axios.get(apiUrl, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
  });

  if (response.status !== 200) {
    throw new Error('HTTP Error: ' + response.status);
  }

  return response.data.values;
};

const getIssuesForSprint = async (sprintId) => {
  const apiUrl = `${process.env.JIRA_BASE_URL}/rest/agile/1.0/sprint/${sprintId}/issue`;
  const response = await axios.get(apiUrl, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
  });

  if (response.status !== 200) {
    throw new Error('HTTP Error: ' + response.status);
  }

  const issues = response.data.issues;
  return issues.filter(issue => issue.fields.issuetype.name === 'Task');
};

const getAllProjectSprintsAndTasks = async () => {
  const projects = await get_All_Projects();

  for (const project of projects) {
    const boards = await getBoardsForProject(project.id);
    for (const board of boards) {
      const sprints = await getSprintsForBoard(board.id);
      for (const sprint of sprints) {
        const tasks = await getIssuesForSprint(sprint.id);
        console.log(`Project: ${project.name}, Board: ${board.name}, Sprint: ${sprint.name}, Tasks: ${tasks.length}`);
        // Process tasks as needed
      }
    }
  }
};



async function get_All_Projects() {
  let projectsApiUrl = `${process.env.JIRA_BASE_URL}/rest/api/3/project/search`; // Replace with your actual domain

  const maxResults = 50;
  let startAt = 0;
  let allProjectLogs = [];

  // Specify the category name to exclude
  const excludedCategory = 'zz.Archived'; // Replace with the category name to exclude

  while (true) {
    const apiUrl = `${projectsApiUrl}?maxResults=${maxResults}&startAt=${startAt}&expand=lead,insight,issueTypes`;
    const response = await axios.get(apiUrl, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
    });

    if (response.status !== 200) {
      throw new Error('HTTP Error: ' + response.status);
    }

    const projectData = response.data.values;

    if (projectData.length === 0) {
      // No more data to fetch
      break;
    }

    // Filter out projects belonging to the excluded category or those with no category
    const filteredProjects = projectData.filter(project => {
      if (!project.projectCategory) {
        // If project has no category, include it
        return true;
      } else if (project.projectCategory.name) {
        return project.projectCategory.name !== excludedCategory;
      } else {
        // Handle the case where project.projectCategory has no name property
        console.warn(`Skipping project with undefined category name: ${project.name}`);
        return false; // Exclude the project
      }
    });

    allProjectLogs = allProjectLogs.concat(filteredProjects);
    startAt += maxResults;
  }

  return allProjectLogs;
}

async function fetchIssueDetails(issueIdOrKey) {
  const url = `${process.env.JIRA_BASE_URL}/rest/api/3/issue/${issueIdOrKey}`;
  const headers = {
    Authorization: `Basic ${auth}`,
    'Content-Type': 'application/json'
  };

  const response = await axios.get(url, { headers });

  if (response.status !== 200) {
    throw new Error('HTTP Error: ' + response.status);
  }

  return response.data;
}

app.get('/jira/projects', async (req, res) => {
  try {
      const datas = await get_All_Projects();
    res.json(datas);
    datas.map(date =>(console.log(date.id)))
    // console.log(datas.id)

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/jira/sprint/report', async (req, res) => {
console.log(req)
  // getAllProjectSprintsAndTasks().catch(error => {
  //   console.error('Error:', error);
  // });

});


app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

