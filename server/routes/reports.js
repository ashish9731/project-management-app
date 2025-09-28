const express = require('express');
const { query, validationResult } = require('express-validator');
const { Timesheet, Task, Project, User } = require('../models/associations');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const moment = require('moment');

const router = express.Router();

// @route   GET /api/reports/daily
// @desc    Generate daily report
// @access  Private
router.get('/daily', [
  authMiddleware,
  query('date').isISO8601().withMessage('Date is required'),
  query('format').optional().isIn(['json', 'csv', 'excel', 'pdf']).withMessage('Invalid format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { date, format = 'json' } = req.query;
    const reportDate = moment(date).format('YYYY-MM-DD');

    const whereClause = { date: reportDate };

    // Role-based filtering
    if (req.user.role === 'employee') {
      whereClause.userId = req.user.id;
    }

    const timesheets = await Timesheet.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Task,
          as: 'task',
          attributes: ['id', 'title', 'status']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'status', 'color']
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    const totalHours = timesheets.reduce((sum, ts) => sum + parseFloat(ts.hours), 0);
    const billableHours = timesheets.filter(ts => ts.isBillable).reduce((sum, ts) => sum + parseFloat(ts.hours), 0);

    const reportData = {
      date: reportDate,
      totalHours,
      billableHours,
      nonBillableHours: totalHours - billableHours,
      totalEntries: timesheets.length,
      timesheets
    };

    if (format === 'json') {
      return res.json({
        success: true,
        data: reportData
      });
    }

    // Generate CSV
    if (format === 'csv') {
      const csvData = generateCSV(reportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="daily-report-${reportDate}.csv"`);
      return res.send(csvData);
    }

    // Generate Excel
    if (format === 'excel') {
      const workbook = await generateExcel(reportData, 'Daily Report');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="daily-report-${reportDate}.xlsx"`);
      await workbook.xlsx.write(res);
      return res.end();
    }

    // Generate PDF
    if (format === 'pdf') {
      const doc = generatePDF(reportData, 'Daily Report');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="daily-report-${reportDate}.pdf"`);
      doc.pipe(res);
      doc.end();
    }

  } catch (error) {
    console.error('Daily report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating daily report'
    });
  }
});

// @route   GET /api/reports/weekly
// @desc    Generate weekly report
// @access  Private
router.get('/weekly', [
  authMiddleware,
  query('startDate').isISO8601().withMessage('Start date is required'),
  query('format').optional().isIn(['json', 'csv', 'excel', 'pdf']).withMessage('Invalid format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { startDate, format = 'json' } = req.query;
    const weekStart = moment(startDate).startOf('week').format('YYYY-MM-DD');
    const weekEnd = moment(startDate).endOf('week').format('YYYY-MM-DD');

    const whereClause = {
      date: {
        [require('sequelize').Op.between]: [weekStart, weekEnd]
      }
    };

    // Role-based filtering
    if (req.user.role === 'employee') {
      whereClause.userId = req.user.id;
    }

    const timesheets = await Timesheet.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Task,
          as: 'task',
          attributes: ['id', 'title', 'status']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'status', 'color']
        }
      ],
      order: [['date', 'ASC'], ['createdAt', 'ASC']]
    });

    // Group by date
    const dailyData = {};
    timesheets.forEach(ts => {
      const date = ts.date;
      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          totalHours: 0,
          billableHours: 0,
          entries: 0,
          timesheets: []
        };
      }
      dailyData[date].totalHours += parseFloat(ts.hours);
      if (ts.isBillable) dailyData[date].billableHours += parseFloat(ts.hours);
      dailyData[date].entries += 1;
      dailyData[date].timesheets.push(ts);
    });

    const totalHours = timesheets.reduce((sum, ts) => sum + parseFloat(ts.hours), 0);
    const billableHours = timesheets.filter(ts => ts.isBillable).reduce((sum, ts) => sum + parseFloat(ts.hours), 0);

    const reportData = {
      weekStart,
      weekEnd,
      totalHours,
      billableHours,
      nonBillableHours: totalHours - billableHours,
      totalEntries: timesheets.length,
      dailyData: Object.values(dailyData),
      timesheets
    };

    if (format === 'json') {
      return res.json({
        success: true,
        data: reportData
      });
    }

    // Generate CSV
    if (format === 'csv') {
      const csvData = generateCSV(reportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="weekly-report-${weekStart}-to-${weekEnd}.csv"`);
      return res.send(csvData);
    }

    // Generate Excel
    if (format === 'excel') {
      const workbook = await generateExcel(reportData, 'Weekly Report');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="weekly-report-${weekStart}-to-${weekEnd}.xlsx"`);
      await workbook.xlsx.write(res);
      return res.end();
    }

    // Generate PDF
    if (format === 'pdf') {
      const doc = generatePDF(reportData, 'Weekly Report');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="weekly-report-${weekStart}-to-${weekEnd}.pdf"`);
      doc.pipe(res);
      doc.end();
    }

  } catch (error) {
    console.error('Weekly report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating weekly report'
    });
  }
});

// @route   GET /api/reports/monthly
// @desc    Generate monthly report
// @access  Private
router.get('/monthly', [
  authMiddleware,
  query('month').matches(/^\d{4}-\d{2}$/).withMessage('Month must be in YYYY-MM format'),
  query('format').optional().isIn(['json', 'csv', 'excel', 'pdf']).withMessage('Invalid format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { month, format = 'json' } = req.query;
    const monthStart = moment(month).startOf('month').format('YYYY-MM-DD');
    const monthEnd = moment(month).endOf('month').format('YYYY-MM-DD');

    const whereClause = {
      date: {
        [require('sequelize').Op.between]: [monthStart, monthEnd]
      }
    };

    // Role-based filtering
    if (req.user.role === 'employee') {
      whereClause.userId = req.user.id;
    }

    const timesheets = await Timesheet.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Task,
          as: 'task',
          attributes: ['id', 'title', 'status']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'status', 'color']
        }
      ],
      order: [['date', 'ASC'], ['createdAt', 'ASC']]
    });

    // Group by project
    const projectData = {};
    timesheets.forEach(ts => {
      const projectId = ts.projectId;
      if (!projectData[projectId]) {
        projectData[projectId] = {
          project: ts.project,
          totalHours: 0,
          billableHours: 0,
          entries: 0,
          timesheets: []
        };
      }
      projectData[projectId].totalHours += parseFloat(ts.hours);
      if (ts.isBillable) projectData[projectId].billableHours += parseFloat(ts.hours);
      projectData[projectId].entries += 1;
      projectData[projectId].timesheets.push(ts);
    });

    // Group by user
    const userData = {};
    timesheets.forEach(ts => {
      const userId = ts.userId;
      if (!userData[userId]) {
        userData[userId] = {
          user: ts.user,
          totalHours: 0,
          billableHours: 0,
          entries: 0,
          timesheets: []
        };
      }
      userData[userId].totalHours += parseFloat(ts.hours);
      if (ts.isBillable) userData[userId].billableHours += parseFloat(ts.hours);
      userData[userId].entries += 1;
      userData[userId].timesheets.push(ts);
    });

    const totalHours = timesheets.reduce((sum, ts) => sum + parseFloat(ts.hours), 0);
    const billableHours = timesheets.filter(ts => ts.isBillable).reduce((sum, ts) => sum + parseFloat(ts.hours), 0);

    const reportData = {
      month,
      monthStart,
      monthEnd,
      totalHours,
      billableHours,
      nonBillableHours: totalHours - billableHours,
      totalEntries: timesheets.length,
      projectData: Object.values(projectData),
      userData: Object.values(userData),
      timesheets
    };

    if (format === 'json') {
      return res.json({
        success: true,
        data: reportData
      });
    }

    // Generate CSV
    if (format === 'csv') {
      const csvData = generateCSV(reportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="monthly-report-${month}.csv"`);
      return res.send(csvData);
    }

    // Generate Excel
    if (format === 'excel') {
      const workbook = await generateExcel(reportData, 'Monthly Report');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="monthly-report-${month}.xlsx"`);
      await workbook.xlsx.write(res);
      return res.end();
    }

    // Generate PDF
    if (format === 'pdf') {
      const doc = generatePDF(reportData, 'Monthly Report');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="monthly-report-${month}.pdf"`);
      doc.pipe(res);
      doc.end();
    }

  } catch (error) {
    console.error('Monthly report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating monthly report'
    });
  }
});

// Helper functions
function generateCSV(data) {
  let csv = 'Date,User,Project,Task,Hours,Billable,Description\n';
  
  if (data.timesheets) {
    data.timesheets.forEach(ts => {
      csv += `"${ts.date}","${ts.user.firstName} ${ts.user.lastName}","${ts.project.name}","${ts.task.title}","${ts.hours}","${ts.isBillable ? 'Yes' : 'No'}","${ts.description || ''}"\n`;
    });
  }
  
  return csv;
}

async function generateExcel(data, title) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Timesheet Report');

  // Add title
  worksheet.addRow([title]);
  worksheet.addRow([`Generated on: ${moment().format('YYYY-MM-DD HH:mm:ss')}`]);
  worksheet.addRow([]);

  // Add summary
  worksheet.addRow(['Summary']);
  worksheet.addRow(['Total Hours', data.totalHours]);
  worksheet.addRow(['Billable Hours', data.billableHours]);
  worksheet.addRow(['Non-Billable Hours', data.nonBillableHours]);
  worksheet.addRow(['Total Entries', data.totalEntries]);
  worksheet.addRow([]);

  // Add timesheet data
  worksheet.addRow(['Date', 'User', 'Project', 'Task', 'Hours', 'Billable', 'Description']);
  
  if (data.timesheets) {
    data.timesheets.forEach(ts => {
      worksheet.addRow([
        ts.date,
        `${ts.user.firstName} ${ts.user.lastName}`,
        ts.project.name,
        ts.task.title,
        ts.hours,
        ts.isBillable ? 'Yes' : 'No',
        ts.description || ''
      ]);
    });
  }

  // Style the header row
  const headerRow = worksheet.getRow(worksheet.rowCount - data.timesheets.length);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  return workbook;
}

function generatePDF(data, title) {
  const doc = new PDFDocument();
  
  doc.fontSize(20).text(title, 50, 50);
  doc.fontSize(12).text(`Generated on: ${moment().format('YYYY-MM-DD HH:mm:ss')}`, 50, 80);
  
  let y = 120;
  
  // Summary
  doc.fontSize(14).text('Summary', 50, y);
  y += 30;
  
  doc.fontSize(12).text(`Total Hours: ${data.totalHours}`, 70, y);
  y += 20;
  doc.text(`Billable Hours: ${data.billableHours}`, 70, y);
  y += 20;
  doc.text(`Non-Billable Hours: ${data.nonBillableHours}`, 70, y);
  y += 20;
  doc.text(`Total Entries: ${data.totalEntries}`, 70, y);
  y += 40;
  
  // Timesheet entries
  doc.fontSize(14).text('Timesheet Entries', 50, y);
  y += 30;
  
  if (data.timesheets) {
    data.timesheets.forEach(ts => {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
      
      doc.fontSize(10).text(`${ts.date} - ${ts.user.firstName} ${ts.user.lastName}`, 70, y);
      y += 15;
      doc.text(`Project: ${ts.project.name}`, 70, y);
      y += 15;
      doc.text(`Task: ${ts.task.title}`, 70, y);
      y += 15;
      doc.text(`Hours: ${ts.hours} (${ts.isBillable ? 'Billable' : 'Non-Billable'})`, 70, y);
      y += 15;
      if (ts.description) {
        doc.text(`Description: ${ts.description}`, 70, y);
        y += 15;
      }
      y += 10;
    });
  }
  
  return doc;
}

module.exports = router;
