// get_time - tool definition.
const TOOL_META = {
    "name": "get_time",
    "description": "Get the current date and time. Optionally accepts an IANA timezone identifier (e.g., 'UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo').",
    "parameters": {
        "type": "object",
        "properties": {
            "timezone": {
                "type": "string",
                "description": "Optional IANA timezone name (e.g., 'UTC', 'America/New_York', 'Asia/Tokyo'). Defaults to the system's local timezone."
            }
        }
    },
    "modes": [
        "code",
        "ask",
        "plan"
    ],
    "permission": "auto",
    "toolBox": 1
};

async function handler(args, api) {
    try {
        const now = new Date();
        const tz = (args && args.timezone && args.timezone.trim()) 
            ? args.timezone.trim() 
            : Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

        const dateFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'shortOffset',
            hour12: false
        });

        const formattedTime = dateFormatter.format(now);

        return [
            `Current Time: ${formattedTime}`,
            `Timezone:     ${tz}`,
            `ISO (UTC):    ${now.toISOString()}`,
            `Unix (ms):    ${now.getTime()}`,
            `Unix (s):     ${Math.floor(now.getTime() / 1000)}`
        ].join('\n');
    } catch (e) {
        return `ERROR: ${e.message}`;
    }
}