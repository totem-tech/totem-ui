import React, { useEffect, useState } from 'react';

export default function FCASite() {
    const [content, setContent] = useState('');

    useEffect(() => {
        fetch('https://dev.totem.live/fca')
            .then(response => response.text())
            .then(data => {
                setContent(data);
                // Parse and execute scripts
                const parser = new DOMParser();
                const doc = parser.parseFromString(data, 'text/html');
                const scripts = doc.querySelectorAll('script');
                scripts.forEach(script => {
                    const newScript = document.createElement('script');
                    newScript.textContent = script.textContent;
                    document.body.appendChild(newScript);
                });
            })
            .catch(error => console.error('Error fetching content:', error));
    }, []);

    // Example of handling local storage
    useEffect(() => {
        const storedData = localStorage.getItem('someKey');
        if (storedData) {
            console.log('Retrieved from local storage:', storedData);
        }
    }, []);

    return (
        <div dangerouslySetInnerHTML={{ __html: content }} />
    );
}