import React, {Component} from 'react'
import Autosuggest from 'react-autosuggest'
  
// https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Regular_Expressions#Using_Special_Characters
function escapeRegexCharacters(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
  
export class TrelloAutosuggest extends Component {
    constructor(props) {
      super(props);
  
      this.state = {
        value: this.props.value,
        suggestions: []
      }

      this.onInputClearRequested = this.onInputClearRequested.bind(this)
      this.onSuggestionsFetchRequested = this.onSuggestionsFetchRequested.bind(this)
      this.onSuggestionsClearRequested = this.onSuggestionsClearRequested.bind(this)
      this.onChange = this.onChange.bind(this)
    }
    

    componentDidUpdate(prevProps) {
      if(prevProps.value != this.props.value) {
        this.setState({value: this.props.value})
      }
    }
  
    onChange(_, { newValue }) {
      this.setState({ value: newValue })
    }
    
    onSuggestionsFetchRequested({ value }) {
      this.setState({ suggestions: this.getSuggestions(value) })
    }
  
    onSuggestionsClearRequested() {
      this.setState({ suggestions: [] })
    }

   onInputClearRequested() {
      this.setState({ value: '' })
    }

    getSuggestions(value) {
        const escapedValue = escapeRegexCharacters(value.trim());
        if (escapedValue === '')
          return []
      
        const regex = new RegExp(escapedValue, 'i');

        return this.props.trelloOptions
          .map(section => {
            return { title: section.title, options: section.options.filter(o => regex.test(o.name)) }
          })
          .filter(section => section.options.length > 0);
      }
      
    getSuggestionValue(suggestion) {
        return suggestion.name
    }

    renderSuggestion(suggestion) {
        return (<span>{suggestion.name}</span>)
    }
    renderSectionTitle(section) {
      return (<strong>{section.title}</strong>)
    }

    getSectionSuggestions(section) {
      return section.options;
    }
  
    render() {
      const { value, suggestions } = this.state
      const inputProps = {
        placeholder: "Type: user, board, organisation",
        value,
        onChange: this.onChange
      }

      let clearButton
      if (value.length >= 1)
        clearButton = <button className="close-icon" onClick={this.onInputClearRequested}>&times;</button>
  
      return (<div className="search-container">
          <Autosuggest 
            suggestions={suggestions}
            multiSection={true}
            onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
            onSuggestionsClearRequested={this.onSuggestionsClearRequested}
            getSuggestionValue={this.getSuggestionValue}
            getSectionSuggestions={this.getSectionSuggestions}
            renderSuggestion={this.renderSuggestion}
            renderSectionTitle={this.renderSectionTitle}
            inputProps={inputProps}
            onSuggestionSelected={this.props.onSuggestionSelected}
          />
          {clearButton}
        </div>)
    }
}