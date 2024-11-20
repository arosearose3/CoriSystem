// services/performanceMonitor.js
export class PerformanceMonitor {
    constructor() {
      this.activityExecutions = [];
      this.maxStoredExecutions = 100;  // Keep last 100 executions
    }
  
    recordExecution(data) {
      this.activityExecutions.push({
        ...data,
        timestamp: new Date()
      });
  
      // Trim if needed
      if (this.activityExecutions.length > this.maxStoredExecutions) {
        this.activityExecutions = this.activityExecutions.slice(-this.maxStoredExecutions);
      }
    }
  
    getStats() {
      const now = new Date();
      const last5Min = new Date(now - 5 * 60 * 1000);
      const last15Min = new Date(now - 15 * 60 * 1000);
      const last1Hour = new Date(now - 60 * 60 * 1000);
  
      return {
        currentTime: now,
        executions: {
          last5Min: this.getExecutionStats(last5Min),
          last15Min: this.getExecutionStats(last15Min),
          last1Hour: this.getExecutionStats(last1Hour),
          total: this.getExecutionStats(new Date(0))
        },
        recentExecutions: this.activityExecutions.slice(-10).map(exec => ({
          executionId: exec.executionId,
          activityRef: exec.activityRef,
          duration: exec.duration,
          status: exec.status,
          timestamp: exec.timestamp
        })),
        activityBreakdown: this.getActivityBreakdown()
      };
    }
  
    getExecutionStats(since) {
      const relevantExecutions = this.activityExecutions.filter(e => e.timestamp > since);
      const successful = relevantExecutions.filter(e => e.status === 'completed');
      const failed = relevantExecutions.filter(e => e.status === 'failed');
  
      if (relevantExecutions.length === 0) {
        return {
          total: 0,
          successful: 0,
          failed: 0,
          avgDuration: 0,
          successRate: 0
        };
      }
  
      return {
        total: relevantExecutions.length,
        successful: successful.length,
        failed: failed.length,
        avgDuration: successful.reduce((acc, curr) => acc + curr.duration, 0) / successful.length,
        successRate: (successful.length / relevantExecutions.length) * 100
      };
    }
  
    getActivityBreakdown() {
      const breakdown = new Map();
      
      this.activityExecutions.forEach(exec => {
        const key = exec.activityRef;
        const current = breakdown.get(key) || {
          total: 0,
          successful: 0,
          failed: 0,
          totalDuration: 0
        };
  
        current.total++;
        if (exec.status === 'completed') {
          current.successful++;
          current.totalDuration += exec.duration;
        } else {
          current.failed++;
        }
  
        breakdown.set(key, current);
      });
  
      return Array.from(breakdown.entries()).map(([activity, stats]) => ({
        activity,
        ...stats,
        avgDuration: stats.successful ? stats.totalDuration / stats.successful : 0
      }));
    }
  }