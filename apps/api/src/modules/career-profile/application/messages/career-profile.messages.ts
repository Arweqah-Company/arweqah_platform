/** Audit action names of the career-path content (their wording for people is in the shared audit catalog). */
export const CAREER_AUDIT = {
  contentSaved: 'career.content.saved',
  learningLinksImported: 'career.learning_links.imported',
  fileUploaded: 'career.content.file_uploaded',
  acknowledged: 'career.acknowledged',
  acknowledgementReopened: 'career.acknowledgement.reopened',
  contentPublished: 'career.content.published',
  contentDrafted: 'career.content.drafted',
  proofSubmitted: 'career.proof.submitted',
  proofApproved: 'career.proof.approved',
  proofRejected: 'career.proof.rejected',
  proofReferred: 'career.proof.referred',
  requiredTicked: 'career.required.ticked',
} as const;

export const CAREER_ENTITY = 'career_title_content';

export const CAREER_PROOF_ENTITY = 'career_learning_record';
