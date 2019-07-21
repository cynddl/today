import React from 'react';
import ReactDOM from 'react-dom';
import App from './app';
import registerServiceWorker from './registerServiceWorker';
import { BrowserRouter } from 'react-router-dom';


ReactDOM.render(<BrowserRouter><App/></BrowserRouter>, document.getElementById('app'));
registerServiceWorker();
