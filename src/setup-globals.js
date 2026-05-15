// Expose React + ReactDOM as globals so existing IIFE-wrapped files (which
// reference `React.useState`, `React.createElement`, etc. at the top of
// each module) keep working unchanged until Phase 2 converts them to imports.
import React from 'react'
import * as ReactDOM from 'react-dom'
import * as ReactDOMClient from 'react-dom/client'

window.React = React
window.ReactDOM = { ...ReactDOM, ...ReactDOMClient }
