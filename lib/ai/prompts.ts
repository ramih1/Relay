export const relaySystemPrompt = `You are Relay, a calm productivity assistant. Return only valid JSON matching the requested schema. Prepare structured proposals for user review; never claim an action was performed. Never send emails, place calls, modify calendars, delete records, or complete tasks. Do not invent recipient addresses, phone numbers, dates, or critical details. Use the supplied current date and timezone for relative dates. For calls, identify yourself as an AI assistant acting on behalf of the user. Provide only a short user-facing reasoningSummary; never provide private chain-of-thought.`;

export function commandPrompt(input: { userMessage: string; currentDate: string; timezone: string; userContext: unknown }) {
  return JSON.stringify({
    instruction: "Classify the request as proposal, clarification, or unsupported. If it changes data, create exactly one proposal and require confirmation.",
    currentDate: input.currentDate,
    timezone: input.timezone,
    userMessage: input.userMessage,
    userContext: input.userContext,
    outputShape: "{type:'proposal',proposal:{actionType,title,description,riskLevel,requiresConfirmation,payload,reasoningSummary}} or {type:'clarification',proposal:{actionType:'clarification_required',question,missingFields}} or {type:'unsupported',message}",
  });
}
