import ReactMarkdown from 'react-markdown';
import { renderToString } from 'react-dom/server';
import React from 'react';

const md1 = "This is a [Link](https://google.com)";
const md2 = "This is a \\[Link\\]\\(https://google.com\\)";
const md3 = "This is a [Link] (https://google.com)";

console.log("1:", renderToString(React.createElement(ReactMarkdown, null, md1)));
console.log("2:", renderToString(React.createElement(ReactMarkdown, null, md2)));
console.log("3:", renderToString(React.createElement(ReactMarkdown, null, md3)));
