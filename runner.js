import inquirer from "inquirer";
import fs from "fs-extra";
import chalk from "chalk";

class Directory {
  constructor() {
    this.files = []; // Stores objects with fileName and fileContent
    this.subdirectories = {}; // Stores subdirectories
  }

  addFile(fileName, fileContent = '') {
    this.files.push({ fileName, fileContent });
  }

  deleteFile(fileName) {
    const index = this.files.findIndex(file => file.fileName === fileName);
    if (index !== -1) {
      this.files.splice(index, 1);
      return true;
    }
    return false;
  }

  editFile(fileName, newContent) {
    const file = this.files.find(file => file.fileName === fileName);
    if (file) {
      file.fileContent = newContent;
      return true;
    }
    return false;
  }

  addSubdirectory(dirName) {
    if (!this.subdirectories[dirName]) {
      this.subdirectories[dirName] = new Directory();
    }
  }

  getSubdirectory(dirName) {
    return this.subdirectories[dirName];
  }

  printStructure(currentPath = '/', indent = 0) {
    const folderIcon = chalk.blue('📁');
    const fileIcon = chalk.green('📄');
    const indentStr = ' '.repeat(indent);

    console.log(`${indentStr}${folderIcon} ${chalk.bold(currentPath)} (directory)`);
    this.files.forEach(file => {
      console.log(`${indentStr}  ${fileIcon} ${file.fileName}`);
    });

    Object.entries(this.subdirectories).forEach(([name, dir]) => {
      const newPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
      dir.printStructure(newPath, indent + 2);
    });
  }

  async writeToDisk(basePath) {
    await fs.ensureDir(basePath);

    await Promise.all(this.files.map(async file => {
      const filePath = `${basePath}/${file.fileName}`;
      await fs.writeFile(filePath, file.fileContent);
    }));

    await Promise.all(Object.entries(this.subdirectories).map(async ([name, dir]) => {
      const dirPath = `${basePath}/${name}`;
      await dir.writeToDisk(dirPath);
    }));
  }
}

function resolvePath(pathStr, root) {
  const parts = pathStr.split('/').filter(part => part !== '');
  let current = root;
  for (const part of parts) {
    current = current.getSubdirectory(part);
    if (!current) return null;
  }
  return current;
}

const fileSystem = {
  root: new Directory(),

  createFolder(parentPath, folderName) {
    const parentDir = resolvePath(parentPath, this.root);
    if (!parentDir) {
      console.log(`Error: Parent directory '${parentPath}' not found`);
      return false;
    }
    parentDir.addSubdirectory(folderName);
    console.log(`Created folder '${folderName}' in '${parentPath}'`);
    return true;
  },

  addFile(dirPath, fileName, fileContent = '') {
    const targetDir = resolvePath(dirPath, this.root);
    if (!targetDir) {
      console.log(`Error: Directory '${dirPath}' not found`);
      return false;
    }
    targetDir.addFile(fileName, fileContent);
    console.log(`Added file '${fileName}' to '${dirPath}'`);
    return true;
  },

  deleteFile(dirPath, fileName) {
    const targetDir = resolvePath(dirPath, this.root);
    if (!targetDir) {
      console.log(`Error: Directory '${dirPath}' not found`);
      return false;
    }
    if (targetDir.deleteFile(fileName)) {
      console.log(`Deleted file '${fileName}' from '${dirPath}'`);
      return true;
    } else {
      console.log(`Error: File '${fileName}' not found in '${dirPath}'`);
      return false;
    }
  },

  editFile(dirPath, fileName, newContent) {
    const targetDir = resolvePath(dirPath, this.root);
    if (!targetDir) {
      console.log(`Error: Directory '${dirPath}' not found`);
      return false;
    }
    if (targetDir.editFile(fileName, newContent)) {
      console.log(`Edited file '${fileName}' in '${dirPath}'`);
      return true;
    } else {
      console.log(`Error: File '${fileName}' not found in '${dirPath}'`);
      return false;
    }
  },

  printStructure() {
    console.log('\nCurrent file structure:');
    this.root.printStructure();
  },

  async downloadStructure(folderName = 'downloaded_structure') {
    try {
      const outputPath = `${process.cwd()}/${folderName}`;
      await fs.remove(outputPath);
      await this.root.writeToDisk(outputPath);
      console.log(`\nStructure downloaded to: ${outputPath}`);
      return true;
    } catch (error) {
      console.error('Error downloading structure:', error.message);
      return false;
    }
  },
};

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
  const { dir, path } = await chooseDirectory();
  const fileName = await chooseFile(dir);
  if (fileName) {
    const file = dir.files.find(file => file.fileName === fileName);
    const { newContent } = await inquirer.prompt({ type: 'editor', name: 'newContent', message: 'Edit file content:', default: file.fileContent });
    fileSystem.editFile(path, fileName, newContent);
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

handleMenu();
