"use client";

import * as React from "react";
import { Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface OptionObject {
    label: string;
    value: string;
}

type Option = string | OptionObject;

interface SearchableSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    className?: string; // Class for the trigger text
    align?: "start" | "center" | "end";
}

export function SearchableSelect({
    value,
    onChange,
    options,
    placeholder = "Select...",
    className,
    align = "center",
}: SearchableSelectProps) {
    const [open, setOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Normalize options to objects for internal handling
    const normalizedOptions = React.useMemo(() => {
        return options.map(o => typeof o === "string" ? { label: o.replace(/_/g, " "), value: o } : o);
    }, [options]);

    // Filter options based on search query
    const filteredOptions = React.useMemo(() => {
        if (!searchQuery) return normalizedOptions;
        const lowerQuery = searchQuery.toLowerCase();
        return normalizedOptions.filter((option) =>
            option.label.toLowerCase().includes(lowerQuery)
        );
    }, [normalizedOptions, searchQuery]);

    // Find label for current value
    const currentLabel = React.useMemo(() => {
        const match = normalizedOptions.find(o => o.value === value);
        return match ? match.label : value; // Fallback to value if not found
    }, [normalizedOptions, value]);

    // specific tweak: if open, focus input. 
    // Radix dropdown usually focuses the first item. 
    // We want to focus the input.
    React.useEffect(() => {
        if (open) {
            // Slight delay to ensure content is mounted
            setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
        } else {
            setSearchQuery(""); // clear search on close
        }
    }, [open]);

    // Handle selecting an item
    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setOpen(false);
    };

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <div
                    className={cn(
                        "cursor-pointer outline-none transition-colors border-b border-primary/30 hover:border-primary text-primary inline-block",
                        className
                    )}
                >
                    {currentLabel || placeholder}
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="w-[300px] p-0 bg-background border-border"
                align={align}
                onCloseAutoFocus={(e) => e.preventDefault()}
            >
                <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <input
                        ref={inputRef}
                        className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="max-h-[300px] overflow-y-auto overflow-x-hidden p-1">
                    {filteredOptions.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                            No results found.
                        </div>
                    ) : (
                        <DropdownMenuGroup>
                            {filteredOptions.slice(0, 100).map((option) => (
                                <DropdownMenuItem
                                    key={option.value + option.label}
                                    onSelect={() => handleSelect(option.value)}
                                    className="cursor-pointer"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4 shrink-0",
                                            value === option.value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <span className="truncate">{option.label}</span>
                                </DropdownMenuItem>
                            ))}
                            {filteredOptions.length > 100 && (
                                <div className="py-2 text-center text-xs text-muted-foreground border-t">
                                    Keep typing for more results...
                                </div>
                            )}
                        </DropdownMenuGroup>
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
