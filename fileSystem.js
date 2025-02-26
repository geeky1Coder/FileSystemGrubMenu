import Directory from './Directory.js';

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

export {resolvePath,fileSystem};