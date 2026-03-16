import { Loader2, Send } from "lucide-react";
import type React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { HttpMethod } from "@/types";

interface RequestUrlBarProps {
  method: HttpMethod;
  url: string;
  isLoading: boolean;
  onMethodChange: (method: HttpMethod) => void;
  onUrlChange: (url: string) => void;
  onSend: () => void;
}

export const RequestUrlBar: React.FC<RequestUrlBarProps> = ({
  method,
  url,
  isLoading,
  onMethodChange,
  onUrlChange,
  onSend,
}) => {
  return (
    <div className="flex gap-2">
      <Select value={method} onValueChange={(v) => onMethodChange(v as HttpMethod)}>
        <SelectTrigger className="w-[100px]">
          <SelectValue placeholder="Method" />
        </SelectTrigger>
        <SelectContent>
          {["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"].map((m) => (
            <SelectItem key={m} value={m} className="font-mono">
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex-1">
        <Input
          placeholder="Enter URL (e.g. https://api.example.com/users)"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          className="font-mono"
          onKeyDown={(e) => e.key === "Enter" && onSend()}
        />
      </div>
      <Button onClick={onSend} disabled={isLoading} className="px-6">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Send
          </>
        )}
      </Button>
    </div>
  );
};
