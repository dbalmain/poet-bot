const SlackClient = require('../slackClient.js');
const Jira = require('../jiraCalls/issueInfo.js');
const Error = require('../helpers/error.js');
const Hyperlink = require('../helpers/hyperlink.js');
const j2s = require('jira2slack');
const DBCalls = require('../helpers/dbCalls.js');


module.exports.process = (event, token, issueID) => {
    if (!issueID){
        // TODO: check database for issueID
        // TODO: error handling
        DBCalls.retrieveJiraIssueID(event.channel)
            .then(ContextIssueID => {
                Error.report(`Context issue: ${ContextIssueID.issueID} @${ContextIssueID.timestamp}`, event, token);
            })
            .catch(error => {
                console.log("Retrieval error: " + error);
                Error.report("Failed to get context issue: " + error, event, token);
            });
    }else{
        Jira.process(issueID)
            .then((response) => respond(response, event, token, issueID))
            .catch((error) => console.log("JirErr: " + error));
    }
};

const respond = (jiraResponse, event, token, issueID) => {
    // catch JIRA call errors
    if (jiraResponse['errorMessages']){
        Error.report("JIRA error: " + jiraResponse['errorMessages'], event, token);
        return;
    }

    const summary = jiraResponse['fields']['summary'];
    const status = jiraResponse['fields']['status']['name'];
    const assignee = jiraResponse['fields']['assignee']['displayName'];
    var desc = jiraResponse['fields']['description'];
    if (!desc){
        desc = 'This ticken has no description.'
    }

    const text = `Description of ${Hyperlink.jiraLink(issueID)}`;
    const attachments = [
        {
            "title": summary,
            "fields": [
                {
                    "title": "Status",
                    "value": status,
                    "short": true
                },
                {
                    "title": "Assignee",
                    "value": assignee,
                    "short": true
                }
            ],
            "color": "good",
            "mrkdwn_in": ["fields"]
        },
        {
            "title": "Description",
            "text": j2s.toSlack(desc),
            "color": "good",
            "mrkdwn_in": ["text"]
        },
    ];
    SlackClient.postMessage(event, text, attachments, token);
};
