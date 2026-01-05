"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { ArrowLeftRight, Clock } from "lucide-react";
import { SearchableSelect } from "./searchable-select";

// Custom type for imports to avoid TS errors if types aren't perfect
import cityTimezones from 'city-timezones';

export function CurrentTime() {
    const [is24Hour, setIs24Hour] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [isLive, setIsLive] = useState(true);

    // Source state (defaults to now in a specific timezone, e.g. UTC or user's preference)
    const [sourceDate, setSourceDate] = useState<Date | null>(null);

    // Live clock interval
    useEffect(() => {
        if (!isLive) return;
        const interval = setInterval(() => {
            setSourceDate(new Date());
        }, 1000);
        return () => clearInterval(interval);
    }, [isLive]);
    const [sourceTimezone, setSourceTimezone] = useState("America/New_York");

    // Resulting local time
    const [localTime, setLocalTime] = useState<Date | null>(null);
    const timeInputRef = useRef<HTMLInputElement>(null);

    const timezones = React.useMemo(() => {
        const standardTzs = Intl.supportedValuesOf("timeZone");

        // Transform standard TZs
        const standardOptions = standardTzs.map(tz => ({
            label: tz.replace(/_/g, " "),
            value: tz
        }));

        // Transform Cities
        // City format: { city: 'Toledo', province: 'Ohio', country: 'United States', timezone: 'America/New_York', ... }
        const cityOptions = cityTimezones.cityMapping.map((city: any) => ({
            label: `${city.city}, ${city.province ? city.province + ", " : ""}${city.country}`,
            value: city.timezone
        }));

        // Filter out cities with invalid timezones (some might not be in Intl support list?)
        // Actually Intl is robust. 
        // Combine: Cities first for better UX? Or mixed?
        // Let's combine and sort by label length or popularity? 
        // Just searching is fine.

        // Deduplicate?

        return [...standardOptions, ...cityOptions];
    }, []);

    useEffect(() => {
        setMounted(true);
        // Initialize source date to "today 17:00" in source timezone for demo purposes
        const now = new Date();
        setSourceDate(now);
    }, []);

    const getSourceDateFromInput = (timeStr: string, tz: string) => {
        const [hours, minutes] = timeStr.split(":").map(Number);
        const now = new Date(); // Use today's date

        // Initial guess: Local time set to target hours
        let d = new Date(now);
        d.setHours(hours);
        d.setMinutes(minutes);
        d.setSeconds(0);
        d.setMilliseconds(0);

        // Iterative adjustment to find the moment that corresponds to HH:mm in SourceTZ
        for (let i = 0; i < 3; i++) {
            const checkParts = new Intl.DateTimeFormat("en-US", {
                timeZone: tz,
                hour: "numeric", minute: "numeric", hour12: false
            }).formatToParts(d);

            const h = parseInt(checkParts.find(p => p.type === "hour")?.value || "0");
            const m = parseInt(checkParts.find(p => p.type === "minute")?.value || "0");

            let targetH = hours;
            if (targetH === 24) targetH = 0;

            const diffMinutes = (targetH * 60 + minutes) - (h * 60 + m);
            if (diffMinutes === 0) break;

            let adjust = diffMinutes;
            if (adjust > 720) adjust -= 1440;
            if (adjust < -720) adjust += 1440;

            d = new Date(d.getTime() + adjust * 60000);
        }
        return d;
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = getSourceDateFromInput(e.target.value, sourceTimezone);
        setSourceDate(newDate);
    };

    const handleTimezoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newTz = e.target.value;
        setSourceTimezone(newTz);
        if (sourceDate) {
            // Extract current wall time in OLD timezone
            const parts = new Intl.DateTimeFormat("en-US", {
                timeZone: sourceTimezone,
                hour: "numeric", minute: "numeric", hour12: false
            }).formatToParts(sourceDate);
            const h = parts.find(p => p.type === "hour")?.value.padStart(2, "0");
            const m = parts.find(p => p.type === "minute")?.value.padStart(2, "0");

            // Re-calculate moment for NEW timezone with SAME wall time
            const newDate = getSourceDateFromInput(`${h}:${m}`, newTz);
            setSourceDate(newDate);
        }
    };

    if (!mounted || !sourceDate) {
        return (
            <div className="flex flex-col items-center justify-center space-y-2 opacity-0 animate-pulse w-full">
                <div className="h-4 w-64 bg-muted/20 rounded"></div>
                <div className="h-32 w-full bg-muted/20 rounded"></div>
                <div className="h-10 w-32 bg-muted/20 rounded"></div>
            </div>
        );
    }

    // Format for input value: explicitly HH:mm
    // Intl sometimes returns things that might confuse inputs, let's be safe
    // Actually, we can just grab hours/minutes from sourceDate if we assume it's correct?
    // But sourceDate is a Moment. We need it in SourceTZ.
    const getTimeInputValue = () => {
        if (!sourceDate) return "00:00";
        const parts = new Intl.DateTimeFormat("en-US", {
            timeZone: sourceTimezone,
            hour: "2-digit", minute: "2-digit", hour12: false
        }).formatToParts(sourceDate);
        const h = parts.find(p => p.type === "hour")?.value || "00";
        const m = parts.find(p => p.type === "minute")?.value || "00";
        // Handle potential "24" hour case if implementation returns it (rare but possible)
        const hNum = parseInt(h, 10);
        const hStr = hNum === 24 ? "00" : hNum.toString().padStart(2, "0");
        return `${hStr}:${m}`;
    };

    const sourceTimeValue = getTimeInputValue();

    // Generate 15-minute intervals
    const timeOptions = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 15) {
            const time = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
            timeOptions.push(time);
        }
    }

    // Ensure current value is in options (fallback if user somehow selected non-15min time)
    if (!timeOptions.includes(sourceTimeValue)) {
        timeOptions.push(sourceTimeValue);
        timeOptions.sort();
    }

    // Handle change for select
    const handleTimeSelectChange = (val: string) => {
        setIsLive(false); // Stop live update
        const newDate = getSourceDateFromInput(val, sourceTimezone);
        setSourceDate(newDate);
    };

    return (
        <div className="flex flex-col items-center justify-center space-y-8 w-full">

            <div className="flex flex-wrap items-center justify-center gap-2 text-accent mb-2 text-lg font-semibold tracking-widest uppercase text-center w-full max-w-4xl leading-relaxed">
                <span className="text-accent">When it is</span>
                <SearchableSelect
                    value={sourceTimeValue}
                    onChange={handleTimeSelectChange}
                    options={timeOptions}
                    placeholder="Select Time"
                    className="text-primary font-bold"
                />

                <span>in</span>

                <SearchableSelect
                    value={sourceTimezone}
                    onChange={(val) => {
                        const newTz = val;
                        setSourceTimezone(newTz);
                        // If live, we don't change date logic, just timezone.
                        // If NOT live, we technically just change the timezone context of the displayed time?
                        // "When it is 17:00 in London" -> "When it is 17:00 in NY".
                        // Current logic re-calculates/shifts sourceDate to match HH:mm of old TZ in new TZ.
                        // But if live, sourceDate should just stay "NOW".
                        if (!isLive && sourceDate) {
                            const parts = new Intl.DateTimeFormat("en-US", {
                                timeZone: sourceTimezone,
                                hour: "numeric", minute: "numeric", hour12: false
                            }).formatToParts(sourceDate);
                            const h = parts.find(p => p.type === "hour")?.value.padStart(2, "0");
                            const m = parts.find(p => p.type === "minute")?.value.padStart(2, "0");
                            const newDate = getSourceDateFromInput(`${h}:${m}`, newTz);
                            setSourceDate(newDate);
                        } else if (isLive) {
                            // Just force update to ensure consistency? 
                            // Interval handles it, but good to be explicit
                            setSourceDate(new Date());
                        }
                    }}
                    options={timezones}
                    placeholder="Select Timezone"
                    className="text-primary font-bold max-w-[200px] md:max-w-none truncate align-bottom"
                />

                <span>, my local time is</span>
            </div>

            <div
                className="flex items-baseline justify-center text-[5rem] sm:text-[8rem] md:text-[14rem] lg:text-[18rem] xl:text-[20rem] leading-none font-light tabular-nums tracking-tighter text-foreground drop-shadow-sm font-sans font-medium text-accent select-none transition-all duration-300" style={{ marginTop: "0rem" }}
            >
                {(() => {
                    // Display sourceDate in LOCAL time
                    const parts = new Intl.DateTimeFormat("en-US", {
                        hour: "numeric",
                        minute: "numeric",
                        second: "numeric",
                        hour12: !is24Hour
                    }).formatToParts(sourceDate);
                    const timeString = parts.filter(p => p.type !== "dayPeriod").map(p => p.value).join("").trim();
                    const period = parts.find(p => p.type === "dayPeriod")?.value;

                    return (
                        <>
                            {timeString}
                            {period && <span className="text-2xl sm:text-4xl md:text-6xl font-light text-accent ml-2 sm:ml-4 -translate-y-4 sm:-translate-y-8 md:translate-y-[-2rem]" style={{ letterSpacing: "0" }}>{period}</span>}
                        </>
                    );
                })()}
            </div>


            <div className="flex flex-col-reverse md:flex-row items-center gap-6 w-full justify-between mt-4 md:mt-0">
                <div className="flex items-center gap-1 w-full md:w-20 justify-center md:justify-start">
                    {/* Live Button */}
                    <button
                        onClick={() => setIsLive(!isLive)}
                        className={`flex items-center gap-2 text-xs font-bold tracking-widest uppercase transition-colors ${isLive ? "text-red-500 animate-pulse" : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <div className={`w-2 h-2 rounded-full ${isLive ? "bg-red-500" : "bg-muted-foreground"}`} />
                        {isLive ? "LIVE" : "PAUSED"}
                    </button>
                </div>

                <div className="flex flex-col items-center gap-1 text-center">
                    <div className="text-sm md:text-base font-bold text-accent uppercase tracking-widest">
                        {Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, " ")}
                    </div>
                    <div className="text-xs md:text-sm text-accent uppercase font-medium">
                        {sourceDate.toLocaleDateString(undefined, {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                        })}
                    </div>
                </div>

                <div className="relative flex items-center p-0.5 bg-white rounded-full border border-border w-full md:w-auto justify-center md:justify-start">
                    {/* Sliding Pill */}
                    <div
                        className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-primary rounded-full transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-sm ${is24Hour ? "left-[calc(50%+2px)]" : "left-1"
                            }`}
                    />

                    <button
                        onClick={() => setIs24Hour(false)}
                        className={`relative z-10 py-2 px-4 rounded-full text-sm font-medium transition-colors duration-300 w-1/2 md:w-15 text-center ${!is24Hour ? "text-background" : "text-accent hover:text-background"
                            }`}
                    >
                        12H
                    </button>
                    <button
                        onClick={() => setIs24Hour(true)}
                        className={`relative z-10 py-2 px-4 rounded-full text-sm font-medium transition-colors duration-300 w-1/2 md:w-15 text-center ${is24Hour ? "text-background" : "text-accent hover:text-background"
                            }`}
                    >
                        24H
                    </button>
                </div>
            </div>
        </div>
    );
}
