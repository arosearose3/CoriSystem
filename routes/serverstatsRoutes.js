import express from 'express';
import osUtils from 'node-os-utils';

const router = express.Router();

router.get('/serverstats', async (req, res) => {
    try {
        const cpuUsage = await osUtils.cpu.usage();
        const cpuFree = await osUtils.cpu.free();
        const memInfo = await osUtils.mem.info();
        const driveInfo = await osUtils.drive.info();
        const netStats = await osUtils.netstat.stats();
        const systemUptime = osUtils.os.uptime(); // Uptime in seconds
        const platform = osUtils.os.platform();
        const hostname = osUtils.os.hostname();
        const totalProcesses = await osUtils.proc.totalProcesses();

        const serverStats = {
            processUptime: process.uptime(), // Node.js process uptime in seconds
            systemUptime: (systemUptime / 3600).toFixed(2), // System uptime in hours
            platform,
            hostname,
            totalMemory: memInfo.totalMemMb,
            freeMemory: memInfo.freeMemMb,
            usedMemory: memInfo.usedMemMb,
            cpuUsage: (cpuUsage * 100).toFixed(2),
            cpuFree: (cpuFree * 100).toFixed(2),
            drive: driveInfo,
            netStats,
            totalProcesses
        };

        res.json(serverStats);
    } catch (error) {
        console.error('Error fetching server stats:', error);
        res.status(500).json({ error: 'Failed to retrieve server stats' });
    }
});

export default router;
