const PALETTES = [
    // 0: Oranges (Original)
    ["#ff8e25", "#ffaa25", "#ffc525", "#ffe025", "#eaff25"],
    // 1: Blues (Icicle)
    ["#2548ff", "#2576ff", "#25aaff", "#25d5ff", "#25faff"],
    // 2: Reds (Magma)
    ["#ff2525", "#ff5425", "#ff8e25", "#ffc525", "#ffe025"],
    // 3: Purples (Neon)
    ["#5e25ff", "#8e25ff", "#be25ff", "#e025ff", "#f525ff"],
    // 4: Greens (Forest)
    ["#008f39", "#25b34b", "#4cd75f", "#8af59a", "#c2ffcc"],
];

const NUMBER_TONES_PER_COLOR = 5;

function getHash(functionName: string) {
    let hash = 0;
    for (let i = 0; i < functionName.length; i++) {
        // A simple shift-and-add hash to mix bits better than simple addition
        hash = (hash << 5) - hash + functionName.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

export function getColor(functionName: string, depth: number) {
    return PALETTES[getHash(functionName) % PALETTES.length][
        depth % NUMBER_TONES_PER_COLOR
    ];
}
