// Terminal color utilities
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',    
    bgGreen: '\x1b[42m',
    bgRed: '\x1b[41m',
};

function colorize(text, color) {
    return `${color}${text}${colors.reset}`;
}

export function highlight(text) {
    return colorize(text, colors.green);
}

export function dim(text) {
    return colorize(text, colors.dim);
}

export function gray(text) {
    return colorize(text, colors.gray);
}

export function success(text) {
    return colorize(text, colors.bright + colors.green);
}

export function error(text) {
    return colorize(text, colors.red);
}
