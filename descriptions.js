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

module.exports = {
  experimentDescription,
  devDescription,
  designDescription,
};
