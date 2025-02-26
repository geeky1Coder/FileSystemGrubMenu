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

export default Directory;