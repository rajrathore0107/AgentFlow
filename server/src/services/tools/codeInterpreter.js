import vm from 'vm';

/**
 * Execute JavaScript code in a sandboxed Node.js VM context.
 * This gives the agent deterministic math and logic capabilities.
 * @param {string} code - The JavaScript code to execute
 * @returns {Promise<string>} - The execution results or error
 */
export async function executeJavaScript(code) {
  return new Promise((resolve) => {
    // We capture console.log output from the sandbox
    const logs = [];
    const sandbox = {
      console: {
        log: (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
        error: (...args) => logs.push('ERROR: ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
      },
      Math,
      Date,
      JSON,
      parseFloat,
      parseInt,
      isNaN,
    };

    const context = vm.createContext(sandbox);

    try {
      // Execute code with a strict 2-second timeout to prevent infinite loops
      const script = new vm.Script(code);
      const result = script.runInContext(context, { timeout: 2000 });
      
      let output = '';
      if (logs.length > 0) {
        output += `--- Console Logs ---\n${logs.join('\n')}\n\n`;
      }
      
      if (result !== undefined) {
        output += `--- Returned Value ---\n${typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)}`;
      }

      if (!output) {
        output = "Code executed successfully but returned undefined and produced no console logs.";
      }

      resolve(output.trim());
    } catch (error) {
      resolve(`Execution Error: ${error.message}`);
    }
  });
}
