export function formatError(error: any): Record<string, any> {
    if (error && typeof error === 'object') {
        const { stack, ...errorWithoutStack } = error;
        return errorWithoutStack;
    }
    return { details: error?.toString() || 'Unknown error' };
}