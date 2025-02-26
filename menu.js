import inquirer from "inquirer";
import {fileSystem,  resolvePath } from './fileSystem.js';
import { exec } from 'child_process';
import path from 'path';
import { promisify } from 'util';

function getAllDirectoryChoices(dir, currentPath = '/') {
  let choices = [{ name: currentPath, value: currentPath }];
  for (const subdirName in dir.subdirectories) {
    const subdir = dir.subdirectories[subdirName];
    const newPath = currentPath === '/' ? `/${subdirName}` : `${currentPath}/${subdirName}`;
    choices = choices.concat(getAllDirectoryChoices(subdir, newPath));
  }
  return choices;
}

async function chooseDirectory() {
  const choices = getAllDirectoryChoices(fileSystem.root);
  const { selectedPath } = await inquirer.prompt({
    type: 'list',
    name: 'selectedPath',
    message: 'Select a folder:',
    choices,
  });
  return { dir: resolvePath(selectedPath, fileSystem.root), path: selectedPath };
}

async function chooseFile(dir) {
  const fileChoices = dir.files.map(file => ({
    name: file.fileName,
    value: file.fileName,
  }));

  if (fileChoices.length === 0) {
    console.log("No files available.");
    return null;
  }

  const { fileName } = await inquirer.prompt({
    type: 'list',
    name: 'fileName',
    message: 'Select a file:',
    choices: fileChoices,
  });

  return fileName;
}

async function handleAddFolder() {
  const { dir, path } = await chooseDirectory();
  const { folderName } = await inquirer.prompt({
    type: 'input',
    name: 'folderName',
    message: 'Enter the folder name:',
    validate: input => {
      if (!input.trim()) return 'Folder name cannot be empty';
      if (input.includes('/')) return 'Folder name cannot contain "/"';
      return true;
    }
  });
  fileSystem.createFolder(path, folderName.trim());
}

async function handleAddFile() {
  const { dir, path } = await chooseDirectory();
  const { fileName, fileContent } = await inquirer.prompt([
    { type: 'input', name: 'fileName', message: 'Enter the file name:' },
    { type: 'input', name: 'fileContent', message: 'Enter the file content (optional):' }
  ]);
  fileSystem.addFile(path, fileName, fileContent);
}

async function handleDeleteFile() {
  const { dir, path } = await chooseDirectory();
  const fileName = await chooseFile(dir);
  if (fileName) fileSystem.deleteFile(path, fileName);
}

async function handleEditFile() {
  const { dir, path: dirPath } = await chooseDirectory();
  const fileName = await chooseFile(dir);
  if (fileName) {
    const file = dir.files.find(file => file.fileName === fileName);
    
    try {
      // Create temp directory if it doesn't exist
      const tempDir = path.join(process.cwd(), 'temp');
      await fs.ensureDir(tempDir);

      // Create temp file with original name and extension
      const tempFile = path.join(tempDir, fileName);
      await fs.writeFile(tempFile, file.fileContent);

      // Use correct path format for Windows
      const sublimePath = 'C:\\Program Files\\Sublime Text 3\\subl.exe';
      const execPromise = promisify(exec);
      
      console.log('Opening file in Sublime Text. Please save and close the file when done...');
      // Use double quotes around paths and proper escaping
      await execPromise(`"${sublimePath}" -w "${tempFile}"`);

      // Read the modified content
      const newContent = await fs.readFile(tempFile, 'utf8');
      
      // Update the file in our virtual filesystem
      fileSystem.editFile(dirPath, fileName, newContent);
      
      // Clean up temp file
      await fs.remove(tempFile);

    } catch (error) {
      console.error('Error editing file in Sublime Text:', error.message);
      // Fallback to inquirer editor
      const { newContent } = await inquirer.prompt({ 
        type: 'editor', 
        name: 'newContent', 
        message: 'Edit file content:', 
        default: file.fileContent 
      });
      fileSystem.editFile(dirPath, fileName, newContent);
    }
  }
}

async function handleViewFile() {
  const { dir, path } = await chooseDirectory();
  const fileName = await chooseFile(dir);
  if (fileName) {
    const file = dir.files.find(file => file.fileName === fileName);
    console.log(`\nContents of '${fileName}':\n`);
    console.log(file.fileContent);
  }
}

async function handleDownload() {
  const { folderName } = await inquirer.prompt({ type: 'input', name: 'folderName', message: 'Folder name for download:', default: 'downloaded_structure' });
  await fileSystem.downloadStructure(folderName.trim());
}

async function handleMenu() {
  const { action } = await inquirer.prompt({
    type: 'list',
    name: 'action',
    message: 'What would you like to do?',
    choices: [
      'Add file',
      'Create folder',
      'Delete file',
      'Edit file content',
      'View file content',
      'Print structure',
      'Download structure',
      'Exit',
    ],
  });

  switch (action) {
    case 'Add file':
      await handleAddFile();
      break;
    case 'Create folder':
      await handleAddFolder();
      break;
    case 'Delete file':
      await handleDeleteFile();
      break;
    case 'Edit file content':
      await handleEditFile();
      break;
    case 'View file content':
      await handleViewFile();
      break;
    case 'Print structure':
      fileSystem.printStructure();
      break;
    case 'Download structure':
      await handleDownload();
      break;
    case 'Exit':
      console.log('Exiting...');
      process.exit(0);
  }

  await handleMenu();
}

export default handleMenu;