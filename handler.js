const { LinearClient } = require('@linear/sdk');

const LABELS = {
	EXPERIMENT: 'f8adea6b-1abc-42c3-b1ec-4d709f3141af',
	AUTOMATED: '867440f5-9170-4d1f-91be-dd88220efe03',
	HOLD: 'f892a5ef-06e4-4294-b718-69b93de685c4',
	DEV: '70e005e1-136c-4bcc-a7b4-605a374c141d',
	DESIGN: '3cf48a10-e71c-4fff-8b27-f6c732039600',
};

const STATUSES = {
	BACKLOG: '1b3761ae-75a4-436b-8c47-9db13fa0c429',
	REFINEMENT: '794c06b9-eb3c-4292-bc4c-bcdcc8916674',
	COMING_UP: '6ce97593-a310-4ff1-988c-761045a9a9d4',
};

const TEMPLATES = {
	WEBSITE: 'ff0baae3-b3fc-4a27-bfa9-87125cf0d2ba',
	CLEANUP: '434cf2fe-e0b6-4c22-8f3b-0ea3c10ec633',
	DEV: '3a99effc-685c-4379-8af7-c1e9a300beb2',
	DESIGN: '4de697d1-5926-43fa-a4ad-d32e942afd31',
	EXPERIMENT: '9cd13017-3a91-44e8-a852-23822a8c9a68',
};

const experimentDescription = (description) => `${description}

### Experiment checklist
 - [ ] **Clear goal**: sufficient info around purpose and goal
 - [ ] **Tracking**: is our goal already tracked?
 - [ ] **Dependencies**: any overlapping experiment
 - [ ] **Team prioritization**: low, medium, high, urgent`;
const devDescription = (description) => `${description}

### Dev checklist
 - [ ] **Effort estimate**: 1 day, 3 days, 5 days, +1 week.
 - [ ] **Testability**: is it clear how and who will test it? Is the requested included.
 - [ ] **[Design link]**
 - [ ] **[tracking]**: do we need to add? With type (utms..)`;
const designDescription = (description) => `${description}

### Design checklist
 - [ ] Clear which problem needs to be solved?
 - [ ] Specific assets included/desired outcome?
 - [ ] Effort estimate
 - [ ] [copy]: clear who will send the request?
 - [ ] [copy]: Needs translations?`;

const linearClient = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });

const handler = async (event) => {
	if (!event.body) {
		return {
			statusCode: 200,
			body: JSON.stringify({ message: 'No webhook data' }),
		};
	}

	try {
		const payload = JSON.parse(event.body);
		const { data: issue, updatedFrom } = payload;
		const { description } = issue;

		const isExperiment = issue.labelIds.includes(LABELS.EXPERIMENT);
		const isAutomated = issue.labelIds.includes(LABELS.AUTOMATED);
		const isMovedToRefinement = issue.stateId === STATUSES.REFINEMENT;
		const isMovedFromBacklog = updatedFrom.stateId === STATUSES.BACKLOG;

		if (isAutomated || !isExperiment || !isMovedToRefinement || !isMovedFromBacklog) {
			// Invalid case, early return

			if (isAutomated) {
				console.log('Issue has already been automated');
			}

			if (!isExperiment) {
				console.log('Issue is not an experiment');
			}

			if (!isMovedToRefinement) {
				console.log('Issue is not moved to refinement');
			}

			if (!isMovedFromBacklog) {
				console.log('Issue is not moved to backlog');
			}

			return {
				statusCode: 200,
				body: JSON.stringify({
					message: 'Webhook issue status invalid',
					isExperiment,
					isAutomated,
					isMovedToRefinement,
					isMovedFromBacklog,
				}),
			};
		}

		// Update experiment issue
		await linearClient.updateIssue(issue.id, {
			description: experimentDescription(description),
			labelIds: issue.labelIds.concat(LABELS.AUTOMATED),
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
			priority: issue.priority,
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
			priority: issue.priority,
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
			priority: issue.priority,
		});

		// Return a response
		return {
			statusCode: 200,
			body: JSON.stringify({ message: 'Webhook processed' }),
		};
	} catch (e) {
		return {
			statusCode: 500,
			body: JSON.stringify({ message: 'Internal Server Error', error: e.message, stack: e.stack }),
		};
	}
};

module.exports = handler;
