import { ToolCallContentPartComponent } from "@assistant-ui/react";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon, CopyIcon, CheckCheckIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight, oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";

export const ToolFallback: ToolCallContentPartComponent = ({
  toolName,
  argsText,
  result,
}) => {
  // Detect if the user prefers dark mode
  const [isDarkMode, setIsDarkMode] = useState(false);
  // State for collapsible display
  const [isCollapsed, setIsCollapsed] = useState(true);
  
  useEffect(() => {
    // Check if the document has a 'dark' class on html or body
    const isDark = document.documentElement.classList.contains('dark') || 
                   document.body.classList.contains('dark');
    setIsDarkMode(isDark);
    
    // Optional: Listen for changes in theme
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const isDark = document.documentElement.classList.contains('dark') || 
                         document.body.classList.contains('dark');
          setIsDarkMode(isDark);
        }
      });
    });
    
    observer.observe(document.documentElement, { attributes: true });
    observer.observe(document.body, { attributes: true });
    
    return () => observer.disconnect();
  }, []);

  // Copy to clipboard function
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // State for copy button
  const [copied, setCopied] = useState(false);

  // Format SQL query for sql_db_query tool
  const renderToolArgs = () => {
    if (toolName === "sql_db_query" && typeof argsText === "string") {
      try {
        const argsObj = JSON.parse(argsText);
        if (argsObj.query) {
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
                  backgroundColor: 'var(--background-muted, #f5f5f5)',
                  border: '1px solid var(--border, #e5e5e5)',
                  paddingRight: '40px', // Make room for the copy button
                }}
              >
                {argsObj.query}
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

  // Format the result
  const renderResult = () => {
    if (typeof result === "string") {
      return result;
    } else {
      return JSON.stringify(result, null, 2);
    }
  };

  // For sql_db_schema, use the original single card with collapsible display
  if (toolName === "sql_db_schema") {
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
                <pre className="whitespace-pre-wrap">
                  {typeof result === "string"
                    ? result
                    : JSON.stringify(result, null, 2)}
                </pre>
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
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Result:</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm">
              {renderResult()}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
