import type { Dispatch } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";

interface FlameGraphCoreOptionsProps {
    selectedOption: "Core 0" | "Core 1" | "Both";
    availableOptions: Array<"Core 0" | "Core 1" | "Both">;
    setOption: Dispatch<React.SetStateAction<"Core 0" | "Core 1" | "Both">>;
    className?: string;
}

export default function FlameGraphCoreOptions({
    selectedOption,
    availableOptions,
    setOption,
    className,
}: FlameGraphCoreOptionsProps) {
    return (
        <div className={className}>
            <Select
                onValueChange={(val: "Core 0" | "Core 1" | "Both") =>
                    setOption(val)
                }
            >
                <SelectTrigger className="w-45">
                    <SelectValue placeholder={selectedOption} />
                </SelectTrigger>
                <SelectContent>
                    {availableOptions.map(
                        (option: "Core 0" | "Core 1" | "Both") => {
                            return (
                                <SelectItem value={option}>{option}</SelectItem>
                            );
                        }
                    )}
                </SelectContent>
            </Select>
        </div>
    );
}
