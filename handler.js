const crypto = require("crypto");
const { LinearClient } = require("@linear/sdk");
const { LABELS, STATUSES, TEMPLATES } = require("./constants");
const {
  experimentDescription,
  designDescription,
  devDescription
} = require("./descriptions");

const linearClient = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });

const formatResponse = (body, statusCode = 200) => ({
  statusCode,
  body: JSON.stringify(body)
});

const handler = async (event) => {
  if (!event.body) {
    return formatResponse({ message: "No webhook data" });
  }

  if (process.env.LINEAR_WEBHOOK_SIGNING_SECRET) {
    const signature = crypto
      .createHmac("sha256", process.env.LINEAR_WEBHOOK_SIGNING_SECRET)
      .update(event.body, "utf8")
      .digest("hex");

    if (signature !== event.headers["Linear-Signature"]) {
      console.error("webhook signature is invalid", signature, event.headers);

      return formatResponse({ message: "webhook signature is invalid" }, 500);
    }
  }

  try {
    const payload = JSON.parse(event.body);
    const { data: issue, updatedFrom = {} } = payload;
    const { description } = issue;

    const isExperiment = issue.labelIds.includes(LABELS.EXPERIMENT);
    const isAutomated = issue.labelIds.includes(LABELS.AUTOMATED);
    const isMovedToRefinement = issue.stateId === STATUSES.REFINEMENT;
    const isMovedFromBacklog = updatedFrom.stateId === STATUSES.BACKLOG;

    if (
      isAutomated ||
      !isExperiment ||
      !isMovedToRefinement ||
      !isMovedFromBacklog
    ) {
      // Invalid case, early return
      console.log("Webhook case status invalid", {
        isAutomated,
        isExperiment,
        isMovedFromBacklog,
        isMovedToRefinement
      });

      return formatResponse({
        message: "Webhook issue status invalid",
        isExperiment,
        isAutomated,
        isMovedToRefinement,
        isMovedFromBacklog
      });
    }

    // Update experiment issue
    await linearClient.updateIssue(issue.id, {
      description: experimentDescription(description),
      labelIds: issue.labelIds.concat(LABELS.AUTOMATED)
    });

    // Create dev task
    await linearClient.createIssue({
      teamId: issue.teamId,
      cycleId: issue.cycleId,
      parentId: issue.id,
      title: `[Dev] ${issue.title}`,
      stateId: STATUSES.COMING_UP,
      labelIds: [LABELS.DEV, LABELS.HOLD],
      templateId: TEMPLATES.DEV,
      description: devDescription(description),
      priority: issue.priority
    });

    // Create design task
    await linearClient.createIssue({
      teamId: issue.teamId,
      cycleId: issue.cycleId,
      parentId: issue.id,
      title: `[Design] ${issue.title}`,
      stateId: issue.stateId,
      labelIds: [LABELS.DESIGN],
      templateId: TEMPLATES.DESIGN,
      description: designDescription(description),
      priority: issue.priority
    });

    // Create cleanup task
    await linearClient.createIssue({
      teamId: issue.teamId,
      cycleId: issue.cycleId,
      parentId: issue.id,
      title: `[Clean up] ${issue.title}`,
      stateId: STATUSES.COMING_UP,
      labelIds: [LABELS.DEV, LABELS.HOLD],
      templateId: TEMPLATES.DEV,
      priority: issue.priority
    });

    // Return a response
    return formatResponse({ message: "Webhook processed" });
  } catch (e) {
    return formatResponse({
      message: "Internal Server Error",
      error: e.message,
      stack: e.stack
    });
  }
};

module.exports = { handler };
