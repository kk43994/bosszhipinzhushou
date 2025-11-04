/**
 * Console 监控器 - 完整捕获F12面板所有输出
 * 用途：拦截所有console方法，实时捕获日志并结构化存储
 */

class ConsoleMonitor {
  constructor() {
    this.logs = [];
    this.maxLogs = 500; // 最多保存500条日志
    this.isCapturing = true;

    // 保存原始console方法
    this.originalConsole = {
      log: console.log.bind(console),
      error: console.error.bind(console),
      warn: console.warn.bind(console),
      info: console.info.bind(console),
      debug: console.debug.bind(console),
      table: console.table ? console.table.bind(console) : null,
      group: console.group ? console.group.bind(console) : null,
      groupEnd: console.groupEnd ? console.groupEnd.bind(console) : null
    };

    this.interceptConsole();
    this.setupGlobalErrorHandlers();
    this.monitorNetworkErrors();
    this.monitorResourceErrors();

    this.log('✅ Console监控器已启动', 'system');
  }

  /**
   * 拦截所有console方法
   */
  interceptConsole() {
    const self = this;

    // 拦截 console.log
    console.log = function(...args) {
      self.capture('log', args);
      self.originalConsole.log.apply(console, args);
    };

    // 拦截 console.error
    console.error = function(...args) {
      self.capture('error', args);
      self.originalConsole.error.apply(console, args);
    };

    // 拦截 console.warn
    console.warn = function(...args) {
      self.capture('warn', args);
      self.originalConsole.warn.apply(console, args);
    };

    // 拦截 console.info
    console.info = function(...args) {
      self.capture('info', args);
      self.originalConsole.info.apply(console, args);
    };

    // 拦截 console.debug
    console.debug = function(...args) {
      self.capture('debug', args);
      self.originalConsole.debug.apply(console, args);
    };
  }

  /**
   * 设置全局错误处理器
   */
  setupGlobalErrorHandlers() {
    const self = this;

    // 捕获未捕获的JavaScript错误
    window.addEventListener('error', (event) => {
      const errorLog = {
        id: self.generateId(),
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString('zh-CN', { hour12: false, fractionalSecondDigits: 3 }),
        type: 'error',
        source: 'window.onerror',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error ? {
          name: event.error.name,
          message: event.error.message,
          stack: event.error.stack
        } : null,
        url: window.location.href
      };

      self.logs.unshift(errorLog);
      self.trimLogs();
      self.notifyCapture(errorLog);

      // 同时输出到原始console
      self.originalConsole.error('🚨 未捕获的错误:', errorLog);
    }, true);

    // 捕获未处理的Promise rejection
    window.addEventListener('unhandledrejection', (event) => {
      const errorLog = {
        id: self.generateId(),
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString('zh-CN', { hour12: false, fractionalSecondDigits: 3 }),
        type: 'error',
        source: 'unhandledrejection',
        message: event.reason?.message || String(event.reason),
        reason: event.reason,
        promise: String(event.promise),
        stack: event.reason?.stack || null,
        url: window.location.href
      };

      self.logs.unshift(errorLog);
      self.trimLogs();
      self.notifyCapture(errorLog);

      // 同时输出到原始console
      self.originalConsole.error('🚨 未处理的Promise rejection:', errorLog);
    });
  }

  /**
   * 监控网络请求错误
   */
  monitorNetworkErrors() {
    const self = this;

    // 拦截 fetch
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      const startTime = Date.now();
      const url = args[0];

      try {
        const response = await originalFetch.apply(this, args);

        // 记录失败的请求
        if (!response.ok) {
          const errorLog = {
            id: self.generateId(),
            timestamp: Date.now(),
            time: new Date().toLocaleTimeString('zh-CN', { hour12: false, fractionalSecondDigits: 3 }),
            type: 'error',
            source: 'fetch',
            message: `网络请求失败: ${response.status} ${response.statusText}`,
            url: url,
            status: response.status,
            statusText: response.statusText,
            duration: Date.now() - startTime,
            method: args[1]?.method || 'GET'
          };

          self.logs.unshift(errorLog);
          self.trimLogs();
          self.notifyCapture(errorLog);
        }

        return response;
      } catch (error) {
        const errorLog = {
          id: self.generateId(),
          timestamp: Date.now(),
          time: new Date().toLocaleTimeString('zh-CN', { hour12: false, fractionalSecondDigits: 3 }),
          type: 'error',
          source: 'fetch',
          message: `网络请求异常: ${error.message}`,
          url: url,
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack
          },
          duration: Date.now() - startTime
        };

        self.logs.unshift(errorLog);
        self.trimLogs();
        self.notifyCapture(errorLog);

        throw error;
      }
    };

    // 拦截 XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      this._bossMonitor = {
        method: method,
        url: url,
        startTime: Date.now()
      };
      return originalXHROpen.apply(this, [method, url, ...args]);
    };

    XMLHttpRequest.prototype.send = function(body) {
      if (this._bossMonitor) {
        this.addEventListener('error', function() {
          const errorLog = {
            id: self.generateId(),
            timestamp: Date.now(),
            time: new Date().toLocaleTimeString('zh-CN', { hour12: false, fractionalSecondDigits: 3 }),
            type: 'error',
            source: 'xhr',
            message: `XHR请求失败`,
            url: this._bossMonitor.url,
            method: this._bossMonitor.method,
            duration: Date.now() - this._bossMonitor.startTime
          };

          self.logs.unshift(errorLog);
          self.trimLogs();
          self.notifyCapture(errorLog);
        });

        this.addEventListener('load', function() {
          if (this.status >= 400) {
            const errorLog = {
              id: self.generateId(),
              timestamp: Date.now(),
              time: new Date().toLocaleTimeString('zh-CN', { hour12: false, fractionalSecondDigits: 3 }),
              type: 'error',
              source: 'xhr',
              message: `XHR请求失败: ${this.status} ${this.statusText}`,
              url: this._bossMonitor.url,
              method: this._bossMonitor.method,
              status: this.status,
              statusText: this.statusText,
              duration: Date.now() - this._bossMonitor.startTime
            };

            self.logs.unshift(errorLog);
            self.trimLogs();
            self.notifyCapture(errorLog);
          }
        });
      }

      return originalXHRSend.apply(this, [body]);
    };
  }

  /**
   * 监控资源加载错误
   */
  monitorResourceErrors() {
    const self = this;

    window.addEventListener('error', (event) => {
      // 只处理资源加载错误
      if (event.target !== window && (event.target.tagName === 'IMG' ||
          event.target.tagName === 'SCRIPT' ||
          event.target.tagName === 'LINK')) {

        const errorLog = {
          id: self.generateId(),
          timestamp: Date.now(),
          time: new Date().toLocaleTimeString('zh-CN', { hour12: false, fractionalSecondDigits: 3 }),
          type: 'error',
          source: 'resource',
          message: `资源加载失败: ${event.target.tagName}`,
          element: event.target.tagName,
          src: event.target.src || event.target.href,
          url: window.location.href
        };

        self.logs.unshift(errorLog);
        self.trimLogs();
        self.notifyCapture(errorLog);
      }
    }, true);
  }

  /**
   * 捕获console输出
   */
  capture(type, args) {
    if (!this.isCapturing) return;

    const log = {
      id: this.generateId(),
      timestamp: Date.now(),
      time: new Date().toLocaleTimeString('zh-CN', { hour12: false, fractionalSecondDigits: 3 }),
      type: type,
      source: 'console',
      args: this.serializeArgs(args),
      argsRaw: args, // 保留原始参数
      stack: this.getStackTrace(),
      url: window.location.href
    };

    this.logs.unshift(log);
    this.trimLogs();
    this.notifyCapture(log);
  }

  /**
   * 序列化参数（处理对象、数组等复杂类型）
   */
  serializeArgs(args) {
    return Array.from(args).map(arg => {
      if (arg === null) return 'null';
      if (arg === undefined) return 'undefined';
      if (typeof arg === 'string') return arg;
      if (typeof arg === 'number') return arg;
      if (typeof arg === 'boolean') return arg;
      if (typeof arg === 'function') return `[Function: ${arg.name || 'anonymous'}]`;
      if (arg instanceof Error) {
        return {
          _type: 'Error',
          name: arg.name,
          message: arg.message,
          stack: arg.stack
        };
      }
      if (Array.isArray(arg)) {
        return {
          _type: 'Array',
          length: arg.length,
          data: arg.slice(0, 100) // 限制长度
        };
      }
      if (typeof arg === 'object') {
        try {
          return JSON.parse(JSON.stringify(arg)); // 深拷贝
        } catch (e) {
          return '[Object: 无法序列化]';
        }
      }
      return String(arg);
    });
  }

  /**
   * 获取调用堆栈
   */
  getStackTrace() {
    try {
      const stack = new Error().stack;
      if (!stack) return null;

      const lines = stack.split('\n');
      // 移除前3行（Error、getStackTrace、capture）
      return lines.slice(3, 8).join('\n');
    } catch (e) {
      return null;
    }
  }

  /**
   * 限制日志数量
   */
  trimLogs() {
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }
  }

  /**
   * 通知有新的捕获
   */
  notifyCapture(log) {
    window.dispatchEvent(new CustomEvent('bossConsoleCapture', {
      detail: log
    }));
  }

  /**
   * 生成唯一ID
   */
  generateId() {
    return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 添加系统日志
   */
  log(message, type = 'system') {
    const log = {
      id: this.generateId(),
      timestamp: Date.now(),
      time: new Date().toLocaleTimeString('zh-CN', { hour12: false, fractionalSecondDigits: 3 }),
      type: type,
      source: 'system',
      args: [message],
      url: window.location.href
    };

    this.logs.unshift(log);
    this.trimLogs();
    this.notifyCapture(log);
  }

  /**
   * 获取所有日志
   */
  getLogs() {
    return this.logs;
  }

  /**
   * 过滤日志
   */
  filterLogs(filters) {
    return this.logs.filter(log => {
      if (filters.type && log.type !== filters.type) return false;
      if (filters.source && log.source !== filters.source) return false;
      if (filters.keyword) {
        const text = JSON.stringify(log).toLowerCase();
        if (!text.includes(filters.keyword.toLowerCase())) return false;
      }
      if (filters.startTime && log.timestamp < filters.startTime) return false;
      if (filters.endTime && log.timestamp > filters.endTime) return false;
      return true;
    });
  }

  /**
   * 清空日志
   */
  clearLogs() {
    this.logs = [];
    this.log('日志已清空', 'system');
  }

  /**
   * 导出日志为文本
   */
  exportAsText() {
    const lines = [];
    lines.push('='.repeat(80));
    lines.push('Boss直聘智能助手 - Console日志导出');
    lines.push('导出时间: ' + new Date().toLocaleString('zh-CN'));
    lines.push('日志数量: ' + this.logs.length);
    lines.push('页面URL: ' + window.location.href);
    lines.push('='.repeat(80));
    lines.push('');

    this.logs.slice().reverse().forEach((log, index) => {
      lines.push(`[${index + 1}] ${log.time} [${log.type.toUpperCase()}] [${log.source}]`);

      if (log.message) {
        lines.push(`  消息: ${log.message}`);
      }

      if (log.args) {
        log.args.forEach((arg, i) => {
          if (typeof arg === 'object') {
            lines.push(`  参数${i + 1}: ${JSON.stringify(arg, null, 2)}`);
          } else {
            lines.push(`  参数${i + 1}: ${arg}`);
          }
        });
      }

      if (log.stack) {
        lines.push(`  堆栈:\n${log.stack}`);
      }

      if (log.error && log.error.stack) {
        lines.push(`  错误堆栈:\n${log.error.stack}`);
      }

      if (log.filename) {
        lines.push(`  文件: ${log.filename}:${log.lineno}:${log.colno}`);
      }

      if (log.url && log.url !== window.location.href) {
        lines.push(`  URL: ${log.url}`);
      }

      lines.push('-'.repeat(80));
      lines.push('');
    });

    return lines.join('\n');
  }

  /**
   * 导出日志为JSON
   */
  exportAsJSON() {
    return JSON.stringify({
      exportTime: new Date().toISOString(),
      pageUrl: window.location.href,
      userAgent: navigator.userAgent,
      totalLogs: this.logs.length,
      logs: this.logs.map(log => ({
        ...log,
        argsRaw: undefined // 移除原始参数（可能包含循环引用）
      }))
    }, null, 2);
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const stats = {
      total: this.logs.length,
      byType: {},
      bySource: {},
      errors: 0,
      warnings: 0,
      recentErrors: []
    };

    this.logs.forEach(log => {
      // 按类型统计
      stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;

      // 按来源统计
      stats.bySource[log.source] = (stats.bySource[log.source] || 0) + 1;

      // 错误和警告计数
      if (log.type === 'error') {
        stats.errors++;
        if (stats.recentErrors.length < 10) {
          stats.recentErrors.push(log);
        }
      }
      if (log.type === 'warn') {
        stats.warnings++;
      }
    });

    return stats;
  }

  /**
   * 暂停捕获
   */
  pause() {
    this.isCapturing = false;
    this.log('Console捕获已暂停', 'system');
  }

  /**
   * 恢复捕获
   */
  resume() {
    this.isCapturing = true;
    this.log('Console捕获已恢复', 'system');
  }

  /**
   * 恢复原始console
   */
  restore() {
    console.log = this.originalConsole.log;
    console.error = this.originalConsole.error;
    console.warn = this.originalConsole.warn;
    console.info = this.originalConsole.info;
    console.debug = this.originalConsole.debug;

    this.log('Console监控器已停止', 'system');
  }
}

// 全局暴露
window.ConsoleMonitor = ConsoleMonitor;
