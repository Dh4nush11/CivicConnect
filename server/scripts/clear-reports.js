require('dotenv').config();
const fs = require('fs/promises');
const path = require('path');
const mongoose = require('mongoose');
const Issue = require('../models/Issue');
const Comment = require('../models/Comment');
const BackgroundCheck = require('../models/BackgroundCheck');

const uploadsDirectory = path.join(__dirname, '..', 'uploads');
const privateUploadsDirectory = path.join(__dirname, '..', 'private_uploads');
const backupDirectory = path.join(__dirname, '..', 'backups');
const confirmed = process.argv.includes('--confirm');

const collectImageNames = (reports) => [...new Set(reports.flatMap((report) => [
  ...(report.images || []),
  report.resolutionPhoto,
]).filter((name) => typeof name === 'string' && name.trim()).map((name) => path.basename(name)))];

const run = async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI must be set.');
  await mongoose.connect(process.env.MONGO_URI);
  const reports = await Issue.find().lean();
  const jobs = await BackgroundCheck.find().lean();
  const imageNames = collectImageNames(reports);
  const stagedPaths = [...new Set(jobs.flatMap((job) => job.filePaths || []))];
  const existingFiles = [];
  for (const name of imageNames) {
    const filePath = path.join(uploadsDirectory, name);
    try {
      await fs.access(filePath);
      existingFiles.push(filePath);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  const existingStagedFiles = [];
  for (const stagedPath of stagedPaths) {
    try {
      await fs.access(stagedPath);
      existingStagedFiles.push(stagedPath);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  console.log(`Reports found: ${reports.length}`);
  console.log(`Referenced image files found: ${existingFiles.length}`);
  console.log(`Pending image checks: ${jobs.length}`);
  console.log(`Private staged image files found: ${existingStagedFiles.length}`);
  if (!confirmed) {
    console.log('Dry run only. No reports, comments, users, or files were changed. Re-run with --confirm to proceed.');
    return;
  }

  await fs.mkdir(backupDirectory, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDirectory, `reports-${timestamp}.json`);
  await fs.writeFile(backupPath, JSON.stringify(reports, null, 2), { flag: 'wx' });
  console.log(`Backup written: ${backupPath}`);

  for (const filePath of existingFiles) await fs.unlink(filePath);
  for (const filePath of existingStagedFiles) {
    const resolved = path.resolve(filePath);
    if (path.dirname(resolved) !== path.resolve(privateUploadsDirectory)) {
      throw new Error(`Refusing to delete staged file outside private upload directory: ${resolved}`);
    }
    await fs.unlink(resolved);
  }
  await BackgroundCheck.deleteMany({});
  const reportIds = reports.map((report) => report._id);
  await Comment.deleteMany({ issueId: { $in: reportIds } });
  const deletion = await Issue.deleteMany({});
  console.log(`Deleted reports: ${deletion.deletedCount}`);
  console.log(`Deleted comments for those reports: ${reportIds.length ? 'yes' : 'none'}`);
  console.log('User accounts were not modified.');
};

run()
  .catch((error) => {
    console.error(`Report cleanup failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState) await mongoose.disconnect();
  });
