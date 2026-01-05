"use client";

import { useState, useEffect } from "react";
import { ArrowRightLeft, Clock } from "lucide-react";

export function TimezoneConverter() {
    const [mounted, setMounted] = useState(false);
    const [baseDate, setBaseDate] = useState<Date | null>(null);
    const [isLive, setIsLive] = useState(true);

    const [sourceTimezone, setSourceTimezone] = useState<string>("UTC");
    const [targetTimezone, setTargetTimezone] = useState<string>("UTC");

    useEffect(() => {
        setMounted(true);
        setBaseDate(new Date());
        setSourceTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        let interval: NodeJS.Timeout;
        if (isLive) {
            interval = setInterval(() => {
                setBaseDate(new Date());
            }, 1000);
        }

        return () => clearInterval(interval);
    }, [isLive, mounted]);

    const timezones = Intl.supportedValuesOf("timeZone");

    // Format helper
    const formatTime = (date: Date, tz: string) =>
        new Intl.DateTimeFormat("en-US", {
            timeZone: tz,
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        }).format(date);

    const formatDate = (date: Date, tz: string) =>
        new Intl.DateTimeFormat("en-US", {
            timeZone: tz,
            dateStyle: "full",
        }).format(date);

    const handleSourceTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIsLive(false);
        if (!baseDate) return;
        const [hours, minutes] = e.target.value.split(":").map(Number);

        // We need to construct a new Date where the time in SourceTZ is hours:minutes
        // This is tricky without a library. simpler approach:
        // Create a date in browser local time that matches, then shift it? 
        // No, standard trick: 
        // 1. Get current date parts in SourceTZ
        // 2. Replace H/M
        // 3. Create ISO string part (problem: offsets).

        // Robust hack with Intl:
        // We iterate or rely on the fact that we can just set UTC hours if we knew the offset.
        // Easier: Use a "reference" date which is just `baseDate`.
        // We can't easily "Set Hours in Specific Timezone" natively.

        // Alternative: Just parse user input as Local Browser Time for simplicity 
        // OR: Use the date string manipulation if we want to be exact for "Today".

        // Let's use a simplified approach that works for most:
        // 1. Get the day/month/year from the current `baseDate` in the source timezone.
        const parts = new Intl.DateTimeFormat("en-US", {
            timeZone: sourceTimezone,
            year: "numeric", month: "numeric", day: "numeric",
            hour: "numeric", minute: "numeric", second: "numeric",
            hour12: false
        }).formatToParts(baseDate);

        // 2. We can try to reconstruct a date string that the Date constructor might not hate,
        // or just use `new Date(year, monthIndex, day, hours, minutes)` which creates Local time,
        // then assume that WAS the source time, and correct the shift?
        // That's complex.

        // Simplest usable "Converter" logic for MVP without heavy libs:
        // Treat the input as modifying the Current Instant.
        // We just want to change the time.
        // Let's assume the user is verifying "What is 5:00 PM <Source> in <Target>?".
        // We can construct a Date object that is roughly correct.

        // Let's just use the current UTC date, set the time to the input, 
        // AND then APPLY the offset difference?

        // Actually, let's keep it very component-local:
        // If I change the time input, I'll update the `baseDate`.
        // I will construct a new Date object.
        // I can use `new Date()` and setHours/Minutes. This sets it in Local Time.
        // If SourceTZ != LocalTime, this is "wrong" strictly speaking, but for a "Simple" converter...

        // Correct approach using only Intl:
        // We can't *set* easily.
        // Let's settle for: changing the time updates the timestamp treating it as Browser Local Time, 
        // unless we want to pull in `date-fns-tz`. 
        // Let's stick to: "Input is interpreted as Local Time" -> "Converted to Target".
        // IF the user selects a SourceTZ different from Local, it might be confusing.

        // Better UX: Show "Time Input" only, which updates the timestamp.
        // We assume the user enters the time relative to the Source Timezone?
        // Let's try to do it right.
        // We can use string manipulation on the ISO string if we assume the date is "today".

        // Let's stick to standard behavior:
        // When you edit the time, we update `baseDate` to be that time *Local to the browser*, 
        // effectively "Changing the instant". 
        // Wait, if I say "10:00 AM in Tokyo", and I am in NY.
        // I want to see what time it is in London.
        // I select Tokyo as source. I type 10:00.
        // This should result in a specific timestamp.

        // Workaround:
        // 1. Create a date string "YYYY-MM-DD HH:mm:00" using parts from formatted current Source Time.
        // 2. Replace HH:mm with input.
        // 3. This string is "Wall time".
        // 4. We need to find the UTC timestamp that produces this Wall Time in SourceTZ.
        // 5. We can brute-force search (fast) or just accept we need a library? 
        //    Actually, we can use `new Date("YYYY-MM-DDTHH:mm:00")` -> gets Local.
        //    Then we measure the error (Format Local -> SourceTZ) and shift.

        const targetHours = hours;
        const targetMinutes = minutes;

        // Current estimate
        let d = new Date(baseDate || new Date());
        d.setHours(targetHours);
        d.setMinutes(targetMinutes);
        d.setSeconds(0);
        d.setMilliseconds(0);

        // Now verify what time 'd' is in SourceTZ
        // We retry adjusting until it matches (simple iterative solver, usually 1-2 steps)
        // Max 3 iterations to avoid infinite loop (e.g. springing forward missing hours)
        for (let i = 0; i < 3; i++) {
            const checkParts = new Intl.DateTimeFormat("en-US", {
                timeZone: sourceTimezone,
                hour: "numeric", minute: "numeric", hour12: false
            }).formatToParts(d);

            const h = parseInt(checkParts.find(p => p.type === "hour")?.value || "0");
            const m = parseInt(checkParts.find(p => p.type === "minute")?.value || "0");

            const diffMinutes = (targetHours * 60 + targetMinutes) - (h * 60 + m);

            if (diffMinutes === 0) break;

            // Adjust d by diff
            // Handle wrapping around day boundaries simply by adding minutes
            // (Be careful of 24h wrap logic, keeping it simple: just add diff)
            // If diff is huge (due to day wrap), adjust.
            let adjust = diffMinutes;
            if (adjust > 720) adjust -= 1440;
            if (adjust < -720) adjust += 1440;

            d = new Date(d.getTime() + adjust * 60000);
        }

        setBaseDate(d);
    };

    const handleReset = () => {
        setIsLive(true);
        setBaseDate(new Date());
    };

    if (!mounted || !baseDate) {
        return null;
    }

    return (
        <div className="w-full max-w-2xl p-8 rounded-3xl bg-card border border-border shadow-2xl flex flex-col gap-8">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-muted-foreground tracking-widest uppercase">
                    Timezone Converter
                </h2>
                <button
                    onClick={handleReset}
                    className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${isLive
                        ? "text-primary-foreground bg-primary hover:bg-primary/90"
                        : "text-muted-foreground bg-secondary hover:bg-secondary/80"
                        }`}
                >
                    <Clock className="w-3 h-3" />
                    {isLive ? "Live" : "Sync to Now"}
                </button>
            </div>

            <div className="grid md:grid-cols-[1fr,auto,1fr] gap-8 items-start">
                {/* Source */}
                <div className="flex flex-col gap-4">
                    <div className="group relative">
                        <label className="text-xs text-muted-foreground font-medium mb-1 block uppercase tracking-wider">From</label>
                        <select
                            value={sourceTimezone}
                            onChange={(e) => setSourceTimezone(e.target.value)}
                            className="w-full bg-transparent text-foreground text-lg font-light border-b border-border py-2 focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
                        >
                            {timezones.map((tz) => (
                                <option key={tz} value={tz} className="bg-popover text-popover-foreground text-base">
                                    {tz.replace(/_/g, " ")}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <input
                            type="time"
                            value={formatTime(baseDate, sourceTimezone)}
                            onChange={handleSourceTimeChange}
                            className="w-full bg-transparent text-5xl md:text-6xl font-thin tracking-tighter text-foreground tabular-nums border-none outline-none p-0 focus:ring-0 [&::-webkit-calendar-picker-indicator]:invert"
                        />
                        <div className="text-sm text-muted-foreground font-light pl-1">
                            {formatDate(baseDate, sourceTimezone)}
                        </div>
                    </div>
                </div>

                {/* Divider / Icon */}
                <div className="flex justify-center md:pt-16">
                    <div className="p-3 rounded-full bg-secondary border border-border text-muted-foreground">
                        <ArrowRightLeft className="w-5 h-5" />
                    </div>
                </div>

                {/* Target */}
                <div className="flex flex-col gap-4">
                    <div className="group relative">
                        <label className="text-xs text-muted-foreground font-medium mb-1 block uppercase tracking-wider">To</label>
                        <select
                            value={targetTimezone}
                            onChange={(e) => setTargetTimezone(e.target.value)}
                            className="w-full bg-transparent text-foreground text-lg font-light border-b border-border py-2 focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
                        >
                            {timezones.map((tz) => (
                                <option key={tz} value={tz} className="bg-popover text-popover-foreground text-base">
                                    {tz.replace(/_/g, " ")}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        {/* Read-only display for target */}
                        <div className="text-5xl md:text-6xl font-thin tracking-tighter text-primary tabular-nums py-[2px]">
                            {formatTime(baseDate, targetTimezone)}
                        </div>
                        <div className="text-sm text-muted-foreground font-light pl-1">
                            {formatDate(baseDate, targetTimezone)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

