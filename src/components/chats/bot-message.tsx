tsx;
import { Message } from "@/store/slices/chatSlice";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useState, useEffect, memo } from "react";
import { Button } from "@nextui-org/react";
import { BiCopy, BiCheck } from "react-icons/bi";
import { useSelector, useDispatch } from "react-redux";
import { setCurrentTypingMessageId } from "@/store/slices/chatSlice";

type P = {
  message: Message;
};

const TypingIndicator = () => (
  <span className="inline-flex ml-1 items-center">
    <span className="w-2 h-2 bg-primary rounded-full animate-ping" />
  </span>
);

const MAX_CODE_HEIGHT = 400;

const CodeBlock = memo(
  ({
    code,
    language,
    shouldScroll,
    isCodeExpanded,
    setIsCodeExpanded,
    handleCopy,
  }) => (
    <div className="w-full my-4 overflow-hidden rounded-lg border border-default-200">
      <div className="flex justify-between items-center bg-default-100 py-2 px-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-default-600">
            {language}
          </span>
          {shouldScroll && (
            <span className="text-xs text-default-400">
              {code.split("\n").length} lines
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {shouldScroll && (
            <Button
              size="sm"
              variant="flat"
              onClick={() => setIsCodeExpanded((prev) => !prev)}
              className="bg-default-200 hover:bg-default-300"
            >
              {isCodeExpanded ? "Collapse" : "Expand"}
            </Button>
          )}
          <Button
            size="sm"
            variant="flat"
            onClick={() => handleCopy(code)}
            className="bg-default-200 hover:bg-default-300"
          >
            {code ? (
              <BiCopy className="h-5 w-5" />
            ) : (
              <BiCheck className="h-5 w-5" />
            )}
            <span>{code ? "Copy Code" : "Copied!"}</span>
          </Button>
        </div>
      </div>
      <div
        className="overflow-x-auto transition-all duration-300 ease-in-out"
        style={{ maxHeight: isCodeExpanded ? "none" : `${MAX_CODE_HEIGHT}px` }}
      >
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          customStyle={{ margin: 0, borderRadius: 0, padding: "1.5rem" }}
          showLineNumbers={true}
          wrapLines={true}
        >
          {code}
        </SyntaxHighlighter>
      </div>
      {!isCodeExpanded && shouldScroll && (
        <div
          className="text-center py-2 bg-default-100 cursor-pointer hover:bg-default-200 transition-colors"
          onClick={() => setIsCodeExpanded(true)}
        >
          <span className="text-sm text-default-600">Click to show more</span>
        </div>
      )}
    </div>
  )
);

export default function BotMessage({ message }: P) {
  const dispatch = useDispatch();
  const currentTypingMessageId = useSelector(
    (state: any) => state.chat.currentTypingMessageId
  );
  const [copySuccess, setCopySuccess] = useState(false);
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isCodeExpanded, setIsCodeExpanded] = useState(false);
  const [isFullyTyped, setIsFullyTyped] = useState(false);
  const isCurrentlyTyping = currentTypingMessageId === message.id;

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  useEffect(() => {
    if (!message?.text) return;

    if (!isCurrentlyTyping) {
      setDisplayText(message.text);
      setIsTyping(false);
      setIsFullyTyped(true);
    } else {
      setDisplayText("");
      setIsTyping(true);
      setIsFullyTyped(false);
      const text = message.text;
      let currentIndex = 0;

      const typingInterval = setInterval(() => {
        if (currentIndex < text.length) {
          setDisplayText((prev) => prev + text[currentIndex]);
          currentIndex++;
        } else {
          clearInterval(typingInterval);
          setIsTyping(false);
          setIsFullyTyped(true);
          dispatch(setCurrentTypingMessageId(null)); // Clear the typing message when done
        }
      }, 10);

      return () => clearInterval(typingInterval);
    }
  }, [message?.text, isCurrentlyTyping, dispatch]);

  if (!message?.text) {
    return null; // Guard against undefined message
  }

  const TextRenderer = ({ children }: { children: string }) => (
    <span>
      {children}
      {isTyping && !isFullyTyped && <TypingIndicator />}
    </span>
  );

  return (
    <div className="self-start flex items-start gap-4 markdown-content w-full">
      <img
        src="/logo.png"
        className="h-8 w-8 object-contain rounded-full flex-shrink-0"
        alt="cerina"
      />
      <div className="w-full max-w-full overflow-hidden">
        <Markdown
          className="leading-8"
          remarkPlugins={[[remarkGfm, { singleTilde: false }]]}
          components={{
            p({ children }) {
              return <TextRenderer>{children as string}</TextRenderer>;
            },
            code({ className, children, ...rest }) {
              const match = /language-(\w+)/.exec(className || "");
              const language = match ? match[1] : "";
              const code = String(children).replace(/\n$/, "");

              if (!match) {
                return (
                  <code
                    className="px-1.5 py-0.5 rounded-md bg-default-100 text-default-600"
                    {...rest}
                  >
                    {children}
                  </code>
                );
              }

              const codeLines = code.split("\n").length;
              const shouldScroll = codeLines > 15;

              return (
                <CodeBlock
                  code={code}
                  language={language}
                  shouldScroll={shouldScroll}
                  isCodeExpanded={isCodeExpanded}
                  setIsCodeExpanded={setIsCodeExpanded}
                  handleCopy={handleCopy}
                />
              );
            },
          }}
        >
          {displayText || ""}
        </Markdown>
      </div>
    </div>
  );
}
