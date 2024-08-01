// Specification: 1.0
// Scenario:
// The admlinistrator of the company information will create a key personnel structure by inputing data about the appointments to the company.
// Each appointment is a member of a group, has a title, and reports to another title or directly to the chairman, the board or the shareholders.
// Note: Another react component will be required to define the actual structure, but for this mockup, it is hard coded here. The other component will also capture the dates on which this data was entered and updated.

// The administrator should already have requested from the appointee their identity and stored it in their partners list. 

// This mechanism begs the question of how does the director interact since this is the CDP dashboard? 
// The concept I forsee is the that there will be two versions of this app. This version only creates business identities and has a certain list of sidebard components. The other version will be designed for a director or appointee and will have a different set of sidebar components. Also the director will not have the ability to create more than one identity but can be present in one or more organisations.




// Start Date
// End Date
// Status: Active, Ceased, Resigned, Deceased, Retired, Suspended, Terminated, On Leave, Acting





import React, { useState } from 'react';
import { Button } from '../../components/buttons'

// Define titles and reportsTo in object format
const titles = {
  advisoryBoardMembers: "Advisory Board Members",
  auditCommitteeChair: "Audit Committee Chair",
  cco: "Chief Compliance Officer (CCO)",
  ceo: "Chief Executive Officer (CEO)",
  cfo: "Chief Financial Officer (CFO)",
  chairmanOfTheBoard: "Chairman of the Board",
  chro: "Chief Human Resources Officer (CHRO)",
  cio: "Chief Information Officer (CIO)",
  clo: "Chief Legal Officer (CLO) / General Counsel",
  cmo: "Chief Marketing Officer (CMO)",
  companySecretary: "Company Secretary",
  coo: "Chief Operating Officer (COO)",
  cro: "Chief Risk Officer (CRO)",
  cso: "Chief Strategy Officer (CSO)",
  cto: "Chief Technology Officer (CTO)",
  executiveDirector: "Executive Director",
  independentDirector: "Independent Director",
  nominationCommitteeChair: "Nomination Committee Chair",
  nonExecutiveDirector: "Non-Executive Director (NED)",
  remunerationCommitteeChair: "Remuneration Committee Chair",
  sid: "Senior Independent Director (SID)",
};

const group = {
    advisory: "Advisory",
    board: "Board of Directors", 
    committees: "Committees",
    otherSeniorRoles: "Other Senior Roles",
    seniorManagement: "Senior Management Positions",
    shareholders: "Shareholders",
};

const membership = {
  advisoryBoardMembers: group.advisory,
  auditCommitteeChair: group.committees,
  cco: group.otherSeniorRoles,
  ceo: group.seniorManagement,
  cfo: group.seniorManagement,
  chairmanOfTheBoard: group.seniorManagement,
  chro: group.seniorManagement,
  cio: group.seniorManagement,
  clo: group.seniorManagement,
  cmo: group.seniorManagement,
  companySecretary: group.seniorManagement,
  coo: group.seniorManagement,
  cro: group.seniorManagement,
  cso: group.seniorManagement,
  cto: group.seniorManagement,
  executiveDirector: group.seniorManagement,
  independentDirector: group.seniorManagement,
  nominationCommitteeChair: group.seniorManagement,
  nonExecutiveDirector: group.seniorManagement,
  remunerationCommitteeChair: group.seniorManagement,
  sid: group.seniorManagement,
};

const reportsTo = {
  chairmanOfTheBoard: titles.shareholders,
  ceo: titles.chairmanOfTheBoard,
  executiveDirector: titles.ceo,
  nonExecutiveDirector: titles.chairmanOfTheBoard,
  sid: titles.chairmanOfTheBoard,
  independentDirector: titles.chairmanOfTheBoard,
  coo: titles.ceo,
  cfo: titles.ceo,
  cto: titles.ceo,
  cmo: titles.ceo,
  chro: titles.ceo,
  clo: titles.ceo,
  companySecretary: titles.chairmanOfTheBoard,
  cio: titles.ceo,
  cco: titles.ceo,
  cro: titles.ceo,
  cso: titles.ceo,
  auditCommitteeChair: titles.board,
  remunerationCommitteeChair: titles.board,
  nominationCommitteeChair: titles.board,
  advisoryBoardMembers: titles.ceo
};

const AppointsForm = () => {
  const [selectedTitle, setSelectedTitle] = useState('');
  const [selectedReportsTo, setSelectedReportsTo] = useState('');
  const [personName, setPersonName] = useState('');

  const handleTitleChange = (event) => {
    const title = event.target.value;
    setSelectedTitle(title);
    setSelectedReportsTo('');
  };

  const handleReportsToChange = (event) => {
    setSelectedReportsTo(event.target.value);
  };

  const handleNameChange = (event) => {
    setPersonName(event.target.value);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    alert(`Appointed ${personName} as ${titles[selectedTitle]}, reporting to ${selectedReportsTo}`);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>
          Name:
          <input type="text" value={personName} onChange={handleNameChange} />
        </label>
      </div>
      <div>
        <label>
          Title:
          <select value={selectedTitle} onChange={handleTitleChange}>
            <option value="">Select Title</option>
            {Object.keys(titles).map((key) => (
              <option key={key} value={key}>{titles[key]}</option>
            ))}
          </select>
        </label>
      </div>
      {selectedTitle && (
        <div>
          <label>
            Reports To:
            <select value={selectedReportsTo} onChange={handleReportsToChange}>
              <option value="">Select Reporting Line</option>
              {reportsTo[selectedTitle].map((report) => (
                <option key={report} value={report}>{report}</option>
              ))}
            </select>
          </label>
        </div>
      )}
      <Button type="submit">Appoint</Button>
    </form>
  );
};

export default AppointsForm;
