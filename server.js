import express from 'express';
import fs from 'fs/promises'; // Use promises-based fs for async/await
import path from 'path';
import { fileURLToPath } from 'url';

// Recreate __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// --- Data Loading ---
// Use a modern async function to read and parse the JSON data.
async function loadPeopleData() {
  const jsonPath = path.join(__dirname, 'data', 'people.json');
  const jsonData = await fs.readFile(jsonPath, 'utf8');
  return JSON.parse(jsonData);
}

// --- Templating Engine ---
// A simple async template engine to replace placeholders like {{key}}
async function renderTemplate(filePath, options = {}) {
  const templatePath = path.join(__dirname, 'templates', filePath);
  let content = await fs.readFile(templatePath, 'utf-8');

  // Replace simple placeholders like {{title}}
  for (const key in options) {
    if (typeof options[key] === 'string') {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, options[key]);
    }
  }

  // Handle complex object replacements like {{person.name}}
  if (options.person) {
    for (const prop in options.person) {
      const regex = new RegExp(`{{person.${prop}}}`, 'g');
      content = content.replace(regex, options.person[prop]);
    }
  }
  
  return content;
}

// --- Static Files Middleware ---
app.use(express.static(path.join(__dirname, 'public')));

// --- Routes ---

// Home Page Route: Lists all consultants
app.get('/', async (req, res) => {
  try {
    const peopleData = await loadPeopleData();
    let peopleHtml = '';
    
    for (const person of peopleData) {
      peopleHtml += `
        <section class="person-card">
          <img src="${person.profilePicture}" alt="Profile picture of ${person.name}" class="profile-pic">
          <div class="person-intro">
            <h2>${person.name}</h2>
            <p>${person.shortIntro}</p>
            <a href="/person/${encodeURIComponent(person.name)}" class="btn">View Details</a>
          </div>
        </section>
      `;
    }
    
    const html = await renderTemplate('index.html', { peopleList: peopleHtml });
    res.send(html);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading the home page.');
  }
});

// Detail Page Route: Shows one consultant's full profile
app.get('/person/:name', async (req, res) => {
  try {
    const peopleData = await loadPeopleData();
    const personName = decodeURIComponent(req.params.name);
    const person = peopleData.find(p => p.name === personName);

    if (!person) {
      return res.status(404).send('Person not found');
    }

    let projectsHtml = '';
    person.projects.forEach(project => {
      projectsHtml += `
        <div class="project-card" style="background-image: url('${project.backgroundImage}');">
          <div class="project-content">
            <h3>${project.name}</h3>
            <p>${project.shortDescription}</p>
            <a href="${project.link}" target="_blank" class="btn-project">View Project</a>
          </div>
        </div>
      `;
    });

    const html = await renderTemplate('person.html', { person, projects: projectsHtml });
    res.send(html);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading the person details.');
  }
});

// --- Server Start ---
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});