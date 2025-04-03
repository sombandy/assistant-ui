import { ToolCallContentPartComponent } from "@assistant-ui/react";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon, CopyIcon, CheckCheckIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight, oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { format as sqlFormat } from "sql-formatter";

export const ToolFallback: ToolCallContentPartComponent = ({
  toolName,
  argsText,
  result,
}) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  
  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(darkModeMediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    darkModeMediaQuery.addEventListener('change', handler);
    
    return () => darkModeMediaQuery.removeEventListener('change', handler);
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [copied, setCopied] = useState(false);

  const formatSqlQuery = (query: string) => {
    if (!query || query.trim() === '') {
      return '';
    }

    if (query.includes("'http") || query.includes("'https")) {
      return query.split('\n')
        .map(line => line.trim())
        .join('\n');
    }

    try {
      return sqlFormat(query, {
        language: 'mysql',
        tabWidth: 2,
        keywordCase: 'upper',
        linesBetweenQueries: 2,
        indentStyle: 'standard'
      });
    } catch (error) {
      console.error('SQL formatting error:', (error as Error).message, query);
      return query;
    }
  };
  
  const renderToolArgs = () => {
    if (toolName === "sql_db_query" && typeof argsText === "string") {
      try {
        const argsObj = JSON.parse(argsText);
        if (argsObj.query) {
          // Format the SQL query for better readability
          const formattedQuery = formatSqlQuery(argsObj.query);
          
          return (
            <div className="mt-2 relative">
              <div className="absolute top-2 right-2 z-10">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 bg-background/80 hover:bg-background/90 backdrop-blur"
                  onClick={() => copyToClipboard(argsObj.query)}
                  title="Copy SQL query"
                >
                  {copied ? 
                    <CheckCheckIcon className="h-4 w-4 text-green-500" /> : 
                    <CopyIcon className="h-4 w-4" />}
                </Button>
              </div>
              <SyntaxHighlighter 
                language="sql"
                style={isDarkMode ? oneDark : oneLight}
                customStyle={{
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  margin: 0,
                  backgroundColor: isDarkMode ? 'var(--background-muted, #1e1e1e)' : 'var(--background-muted, #f5f5f5)',
                  border: '1px solid var(--border, #e5e5e5)',
                  paddingRight: '40px', // Make room for the copy button
                }}
                codeTagProps={{
                  style: isDarkMode ? { color: 'var(--foreground, #ffffff)' } : undefined
                }}
              >
                {formattedQuery}
              </SyntaxHighlighter>
            </div>
          );
        }
      } catch (e) {
        // If parsing fails, fall back to default rendering
      }
    }
    return (
      <pre className="whitespace-pre-wrap text-sm">{argsText}</pre>
    );
  };

  // Generate HTML table directly
  const generateHtmlTable = (rows: string[][]) => {
    // Add custom CSS to ensure tables stay within boundaries
    const customStyles = `
      <style>
        .sql-result-table {
          border-collapse: collapse;
          width: auto;
          min-width: 100%;
          table-layout: auto;
          margin-top: 0;
          margin-bottom: 0;
        }
        .sql-result-table td {
          border: 1px solid var(--border, #e5e5e5);
          padding: 10px 16px;
          text-align: left;
          white-space: nowrap;
        }
      </style>
    `;
    
    let tableHtml = '<table class="sql-result-table">';
    
    // Add rows
    rows.forEach(row => {
      tableHtml += '<tr>';
      row.forEach(cell => {
        tableHtml += `<td>${cell}</td>`;
      });
      tableHtml += '</tr>';
    });
    
    tableHtml += '</table>';
    
    return customStyles + tableHtml;
  };

  // Check if the result is an SQL error
  const isSqlError = (str: string) => {
    return typeof str === "string" && str.trim().startsWith("Error:");
  };

  // Check if a string might be JSON
  const isJsonString = (str: string) => {
    try {
      const json = JSON.parse(str);
      return typeof json === 'object' && json !== null;
    } catch (e) {
      return false;
    }
  };

  // Format JSON with syntax highlighting
  const formatJson = (data: any) => {
    if (typeof data === 'string') {
      try {
        // Try to parse it if it's a string
        data = JSON.parse(data);
      } catch (e) {
        // If it's not valid JSON, return as is
        return data;
      }
    }
    return JSON.stringify(data, null, 2);
  };

  // Format the result
  const renderResult = () => {
    if (typeof result === "string") {
      // Check for SQL errors
      if (isSqlError(result)) {
        return "SQL Error";
      }
      
      // Check if the string is JSON
      if (isJsonString(result)) {
        try {
          const jsonData = JSON.parse(result);
          const formattedJson = formatJson(jsonData);
          
          return (
            <div className="mt-2 relative">
              <div className="absolute top-2 right-2 z-10">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 bg-background/80 hover:bg-background/90 backdrop-blur"
                  onClick={() => copyToClipboard(typeof result === 'string' ? result : JSON.stringify(jsonData))}
                  title="Copy JSON"
                >
                  {copied ? 
                    <CheckCheckIcon className="h-4 w-4 text-green-500" /> : 
                    <CopyIcon className="h-4 w-4" />}
                </Button>
              </div>
              <SyntaxHighlighter 
                language="json"
                style={isDarkMode ? oneDark : oneLight}
                customStyle={{
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  margin: 0,
                  backgroundColor: isDarkMode ? 'var(--background-muted, #1e1e1e)' : 'var(--background-muted, #f5f5f5)',
                  border: '1px solid var(--border, #e5e5e5)',
                  paddingRight: '40px', // Make room for the copy button
                }}
                codeTagProps={{
                  style: isDarkMode ? { color: 'var(--foreground, #ffffff)' } : undefined
                }}
              >
                {formattedJson}
              </SyntaxHighlighter>
            </div>
          );
        } catch (e) {
          console.error('Failed to parse JSON:', e);
        }
      }
      
      // Try to detect if the result is a list of tuples (like Python list output)
      if (result.trim().startsWith("[") && result.trim().endsWith("]") && result.includes("(")) {
        try {
          // Extract the content between the outer brackets
          const listContent = result.trim().substring(1, result.trim().length - 1).trim();
          
          // Better regex to extract tuples, handling nested parentheses and quotes
          const rows = [];
          let depth = 0;
          let currentTuple = "";
          let inQuote = false;
          let quoteChar = null;
          
          for (let i = 0; i < listContent.length; i++) {
            const char = listContent[i];
            
            // Handle quotes
            if ((char === '"' || char === "'") && (i === 0 || listContent[i-1] !== '\\')) {
              if (!inQuote) {
                inQuote = true;
                quoteChar = char;
              } else if (char === quoteChar) {
                inQuote = false;
                quoteChar = null;
              }
            }
            
            // Only count parentheses if not in a quote
            if (!inQuote) {
              if (char === '(') {
                depth++;
                if (depth === 1) {
                  currentTuple = "";
                  continue; // Skip the opening parenthesis
                }
              } else if (char === ')') {
                depth--;
                if (depth === 0) {
                  rows.push(currentTuple.trim());
                  // Skip until we find the next tuple
                  while (i < listContent.length && listContent[i] !== '(') {
                    i++;
                  }
                  i--; // Adjust for the next iteration
                  continue;
                }
              }
            }
            
            if (depth > 0) {
              currentTuple += char;
            }
          }
          
          if (rows.length > 0) {
            // Parse the first row to determine columns
            const parseRow = (rowStr: string) => {
              const values = [];
              let currentValue = "";
              let inQuote = false;
              let quoteChar = null;
              
              for (let i = 0; i < rowStr.length; i++) {
                const char = rowStr[i];
                
                // Handle quotes
                if ((char === '"' || char === "'") && (i === 0 || rowStr[i-1] !== '\\')) {
                  if (!inQuote) {
                    inQuote = true;
                    quoteChar = char;
                    continue; // Skip the opening quote
                  } else if (char === quoteChar) {
                    inQuote = false;
                    quoteChar = null;
                    continue; // Skip the closing quote
                  }
                }
                
                // Handle commas as separators, but only if not in quotes
                if (char === ',' && !inQuote) {
                  values.push(currentValue.trim());
                  currentValue = "";
                  continue;
                }
                
                currentValue += char;
              }
              
              // Add the last value
              if (currentValue.trim()) {
                values.push(currentValue.trim());
              }
              
              return values;
            };
            
            // Helper function to process datetime.date objects
            const processDatetime = (values: string[]) => {
              const processed = [];
              let i = 0;
              
              while (i < values.length) {
                let value = values[i];
                
                // Check if this is the start of a datetime.date
                if (value.includes("datetime.date")) {
                  // Collect the next values that are part of the date
                  let dateStr = value;
                  let j = i + 1;
                  
                  // Look ahead for date components
                  while (j < values.length && !isNaN(Number(values[j]))) {
                    dateStr += "-" + values[j];
                    j++;
                  }
                  
                  // Replace datetime.date with a formatted date
                  const dateMatch = dateStr.match(/datetime\.date\((\d+),\s*(\d+),\s*(\d+)\)/);
                  if (dateMatch) {
                    processed.push(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`);
                  } else {
                    // Try another format
                    const simpleDateMatch = dateStr.match(/datetime\.date\((\d+)-(\d+)-(\d+)\)/);
                    if (simpleDateMatch) {
                      processed.push(`${simpleDateMatch[1]}-${simpleDateMatch[2]}-${simpleDateMatch[3]}`);
                    } else {
                      // If we can't parse it, just add the original string
                      processed.push(dateStr);
                    }
                  }
                  
                  // Skip the values we've processed
                  i = j;
                } else {
                  processed.push(value);
                  i++;
                }
              }
              
              return processed;
            };
            
            const columns = parseRow(rows[0]);
            
            // Parse all rows and process datetime values
            const tableRows = rows.map(row => {
              const parsedRow = parseRow(row);
              return processDatetime(parsedRow);
            });
            
            // Generate HTML table directly
            return generateHtmlTable(tableRows);
          }
        } catch (e) {
          // If parsing fails, fall back to default rendering
          console.error('Failed to parse tuples:', e);
        }
      }
      
      return result;
    } else if (typeof result === 'object' && result !== null) {
      const formattedJson = formatJson(result);
      
      return (
        <div className="mt-2 relative">
          <div className="absolute top-2 right-2 z-10">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 bg-background/80 hover:bg-background/90 backdrop-blur"
              onClick={() => copyToClipboard(JSON.stringify(result))}
              title="Copy JSON"
            >
              {copied ? 
                <CheckCheckIcon className="h-4 w-4 text-green-500" /> : 
                <CopyIcon className="h-4 w-4" />}
            </Button>
          </div>
          <SyntaxHighlighter 
            language="json"
            style={isDarkMode ? oneDark : oneLight}
            customStyle={{
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              margin: 0,
              backgroundColor: isDarkMode ? 'var(--background-muted, #1e1e1e)' : 'var(--background-muted, #f5f5f5)',
              border: '1px solid var(--border, #e5e5e5)',
              paddingRight: '40px', // Make room for the copy button
            }}
            codeTagProps={{
              style: isDarkMode ? { color: 'var(--foreground, #ffffff)' } : undefined
            }}
          >
            {formattedJson}
          </SyntaxHighlighter>
        </div>
      );
    } else {
      return String(result);
    }
  };

  // For sql_db_schema or SQL errors, use the single card with collapsible display
  if (toolName === "sql_db_schema" || (toolName === "sql_db_query" && typeof result === "string" && isSqlError(result))) {
    return (
      <div className="mb-4 flex w-full flex-col gap-3 rounded-lg border py-3">
        <div className="flex items-center gap-2 px-4">
          <CheckIcon className="size-4" />
          <p className="">
            Used tool: <b>{toolName}</b>
          </p>
          <div className="flex-grow" />
          <Button onClick={() => setIsCollapsed(!isCollapsed)}>
            {isCollapsed ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </Button>
        </div>
        {!isCollapsed && (
          <div className="flex flex-col gap-2 border-t pt-2">
            <div className="px-4">
              <pre className="whitespace-pre-wrap">{argsText}</pre>
            </div>
            {result !== undefined && (
              <div className="border-t border-dashed px-4 pt-2">
                <p className="font-semibold">Result:</p>
                <div className="whitespace-pre-wrap">
                  {/* Use dangerouslySetInnerHTML for markdown tables */}
                  <div 
                    className="overflow-x-auto overflow-y-auto max-w-full" 
                    style={{ maxHeight: '400px' }}
                  >
                    {typeof result === "string" && !isJsonString(result) ? (
                      <div dangerouslySetInnerHTML={{ __html: renderResult() }} />
                    ) : (
                      renderResult()
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // For other tools, use the separate cards
  return (
    <div className="mb-4 flex w-full flex-col gap-3">
      {/* Tool Call Card */}
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckIcon className="size-4" />
            Used tool: <span className="font-bold">{toolName}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderToolArgs()}
        </CardContent>
      </Card>

      {/* Tool Result Card */}
      {result !== undefined && (
        <Card className="w-full">
          {/* No header for SQL query results */}
          <div className="px-4 pt-1">
            {/* Use dangerouslySetInnerHTML for markdown tables */}
            <div 
              className="overflow-x-auto overflow-y-auto max-w-full" 
              style={{ maxHeight: '400px' }}
            >
              {typeof result === "string" && !isJsonString(result) ? (
                <div dangerouslySetInnerHTML={{ __html: renderResult() }} />
              ) : (
                renderResult()
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
