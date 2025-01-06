const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const app = express();
const cors = require('cors');

app.use(express.json());
app.use(cors());

// Cleanup function to remove temporary files
const cleanupTempFiles = (filePaths) => {
  filePaths.forEach((filePath) => {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });
};

// Helper function to execute code with input
const executeWithInput = (command, args, input) => {
  return new Promise((resolve, reject) => {
    let output = '';
    let errorOutput = '';
    
    const process = spawn(command, args);
    
    // Write input to stdin if provided
    if (input) {
      process.stdin.write(input);
      process.stdin.end();
    }

    // Collect output
    process.stdout.on('data', (data) => {
      output += data.toString();
    });

    process.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    // Handle process completion
    process.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(errorOutput || 'Execution failed'));
      } else {
        resolve(output);
      }
    });

    // Handle process errors
    process.on('error', (err) => {
      reject(err);
    });

    // Set timeout
    setTimeout(() => {
      process.kill();
      reject(new Error('Execution timed out'));
    }, 5000); // 5 second timeout
  });
};

app.post('/execute', async (req, res) => {
  const { language, code, input } = req.body;
  let fileName;
  let command;
  let args;

  try {
    switch (language) {
      case 'python':
        fileName = 'temp.py';
        fs.writeFileSync(fileName, code);
        command = 'python';
        args = [fileName];
        break;

      case 'javascript':
        fileName = 'temp.js';
        fs.writeFileSync(fileName, code);
        command = 'node';
        args = [fileName];
        break;

      case 'cpp':
        fileName = 'temp.cpp';
        const executableName = process.platform === 'win32' ? 'temp.exe' : 'temp';
        fs.writeFileSync(fileName, code);
        
        // First compile
        await executeWithInput('g++', [fileName, '-o', executableName], null);
        
        // Then execute
        command = `./${executableName}`;
        args = [];
        break;

      case 'java':
        // Extract class name from code
        const classMatch = code.match(/public\s+class\s+(\w+)/);
        if (!classMatch) {
          throw new Error('Could not find public class name in Java code');
        }
        const className = classMatch[1];
        fileName = `${className}.java`;
        
        fs.writeFileSync(fileName, code);
        
        // First compile
        await executeWithInput('javac', [fileName], null);
        
        // Then execute
        command = 'java';
        args = [className];
        break;

      default:
        return res.status(400).json({ error: 'Unsupported language' });
    }

    const output = await executeWithInput(command, args, input);
    
    // Cleanup files
    const tempFiles = [
      fileName,
      'temp',
      'temp.exe',
      `${fileName.split('.')[0]}.class`
    ];
    cleanupTempFiles(tempFiles);

    res.json({ output });

  } catch (error) {
    // Cleanup files in case of error
    const tempFiles = [
      fileName,
      'temp',
      'temp.exe',
      `${fileName.split('.')[0]}.class`
    ];
    cleanupTempFiles(tempFiles);

    res.status(500).json({ 
      error: error.message || 'An error occurred during execution' 
    });
  }
});

app.listen(5000, () => {
  console.log('Server listening on port 5000');
});