import React from 'react';

export default function CHSite() {
    return (
        <React.Fragment>
        <div style={{ height: '100vh', width: '100%' }}>
        <iframe
        src="https://identity.company-information.service.gov.uk/"
        style={{ height: '100%', width: '100%', border: 'none' }}
        title="FCA Website Login"
        />
        </div>
        </React.Fragment>
    )
}
