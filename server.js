const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const app = express();
const cors = require('cors');

app.use(express.json()); // To parse JSON bodies
app.use(cors());

// Cleanup function to remove temporary files
const cleanupTempFiles = (filePaths) => {
  filePaths.forEach((filePath) => {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath); // Delete the file
    }
  });
};

// Endpoint to execute code
app.post('/execute', (req, res) => {
  const { language, code } = req.body;

  let command;
  let fileName;

  switch (language) {
    case 'python':
      fileName = 'temp.py';
      fs.writeFileSync(fileName, code);
      command = `python ${fileName}`;
      break;
    case 'javascript':
      fileName = 'temp.js'; // Temporary file for JavaScript
      fs.writeFileSync(fileName, code); // Write code to file
      command = `node ${fileName}`; // Execute the file
      break;
    case 'cpp':
      fileName = 'temp.cpp';
      fs.writeFileSync(fileName, code);
      command = `g++ ${fileName} -o temp && ./temp`;
      break;
    case 'java':
      fileName = 'Temp.java';
      fs.writeFileSync(fileName, code);
      command = `javac ${fileName} && java Temp`; // Compile and run Java code
      break;
    default:
      return res.status(400).json({ error: 'Unsupported language' });
  }

  const timeout = 5000; // 5 seconds timeout
  const tempFiles = [fileName, 'Temp.class', 'temp']; // Files to clean up

  const process = exec(command, { timeout }, (error, stdout, stderr) => {
    // Cleanup files after execution
    cleanupTempFiles(tempFiles);

    if (error) {
      return res.status(500).json({ error: error.killed ? 'Execution timed out' : stderr });
    }
    res.json({ output: stdout });
  });

  // Handle timeout explicitly
  process.on('error', (err) => {
    cleanupTempFiles(tempFiles);
    res.status(500).json({ error: 'An error occurred during execution.' });
  });
});

app.listen(5000, () => {
  console.log('Server listening on port 5000');
});
