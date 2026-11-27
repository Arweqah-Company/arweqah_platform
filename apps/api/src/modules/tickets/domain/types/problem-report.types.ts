/** What the AI service made of a report: the words of the ticket and a guess at where the problem is. */
export interface ProblemAnalysis {
  title: string;
  summary: string;
  stepsGuess: string[];
  area: string;
  kind: 'bug' | 'question' | 'suggestion' | 'other';
}
