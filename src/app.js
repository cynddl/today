/* eslint-disable import/first */

import React, { Component } from "react"
import _ from "lodash";

import { hot } from 'react-hot-loader'

// jQuery
import jquery from "jquery";
window.$ = window.jQuery = jquery;

// Trello
import { Trello } from "./vendors/trello.js";
window.Trello = Trello;

// Semantic UI
import { Container, Segment } from "semantic-ui-react";
import "semantic-ui-css/semantic.min.css";

// Autocompletion
import { TrelloAutosuggest } from './TrelloAutosuggest'

// Routing
import Navigo from 'navigo';

import "./app.css";

import {cardLabelsRank, oneWeekAway} from "./utils";
import { DataRenderer } from './DataRenderer'


class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            cards: [],
            organizations: [],
            users: {},
            selectedOrg: "all",
            me: null,
            route: null
        };

        // Initialize routing
        this.router = new Navigo(null, true, '#!');
        this.router
            .on('/user/:id', (params) => this.selectRoute('user', params.id) )
            .on('/board/:id', (params) => this.selectRoute('board', params.id) )
            .on('/org/:id', (params) => this.selectRoute('org', params.id) )
            .on('*', () => this.selectRoute() )
            .resolve();


        // Authorization to fetch data from Trello
        Trello.authorize({
            name: "Today for Trello",
            type: "redirect",
            interactive: true,
            expiration: "never",
        });

        // Get all cards across boards
        let self = this;

        Trello.get("members/me", function(me) {
            self.setState({route: {category: 'user', id: me.id}});
        })

        Trello.get("members/me/organizations", (orgs) => 
            self.setState({organizations: orgs})
        );

        Trello.get("members/me/boards?filter=open", function(boards) {
            for(let b of boards) {
                Trello.get(`boards/${b.id}/members`, function(members) {
                    for(let m of members) {
                        self.state.users[m.id] = m;
                    }
                });

                Trello.get(`boards/${b.id}/cards?filter=open`, function(cards) {
                    var new_cards = [];
                    for(let card of cards) {
                        // Update fields
                        card.board = b.name;
                        card.boardId = b.id;
                        card.idOrganization = b.idOrganization;
                        card.labels = _.sortBy(card.labels, cardLabelsRank);
                        if (card.due !== null)
                            card.due = new Date(card.due);
                        new_cards.push(card);
                    }
                    new_cards = self.state.cards.concat(new_cards);
                    var [block_due, block_then] = _.partition(new_cards, oneWeekAway);
                    new_cards = _.concat(
                        _.orderBy(block_due, ['due', cardLabelsRank], ['asc', 'asc']),
                        _.orderBy(block_then, [cardLabelsRank, 'due'], ['asc', 'asc']),
                    );
                    self.setState({ cards: new_cards})
                });
            }
        });
    }

    selectRoute(category, id) {
        this.setState({route: {category: category, id: id}})
    }

    onSuggestionSelected(_, e) {
        this.router.navigate(`#!/${e.suggestion.type}/${e.suggestion.id}`)
    }

    render() {
        const { cards, users, organizations } = this.state;

        const options = _.map(users, (u, id) => (
            {key: u.id, text: u.fullName, value: u.id, to: '/user/' + u.id}
        )); 
        options.sort(function (a, b) {
            return a.text.localeCompare(b.text);
        });

        const dedupeByProperty = (arr, objKey) =>
            arr.reduce((acc, curr) =>
            acc.some(a => a[objKey] === curr[objKey])
                ? acc
                : [...acc, curr], [])

        const uniqueUsers = _.map(users, (u, id) => ({name: u.fullName, type: 'user', id: u.id}))
        const uniqueBoards = dedupeByProperty(
            _.map(cards, (c, id) => ({name: c.board, type: 'board', id: c.boardId})),
            'id')
        const uniqueOrgs = dedupeByProperty(
            _.map(organizations, (o, id) => ({name: o.displayName, type: 'org', id: o.id})),
            'id')

        const suggestions = [
            { title: 'Users', options: uniqueUsers },
            { title: 'Organizations', options: uniqueOrgs },
            { title: 'Boards', options: uniqueBoards }
        ]

        let _cards = cards
        if(this.state.route && this.state.route.category == 'user')
            _cards = this.state.cards.filter((c) => c.idMembers.includes(this.state.route.id))
        else if(this.state.route && this.state.route.category == 'board')
            _cards = this.state.cards.filter((c) => c.boardId == this.state.route.id)
        else if(this.state.route && this.state.route.category == 'org')
            _cards = this.state.cards.filter((c) => c.idOrganization == this.state.route.id)

        return (
            <Container fluid={true}>
                    <Segment basic>
                        <TrelloAutosuggest trelloOptions={suggestions} onSuggestionSelected={this.onSuggestionSelected.bind(this)} />
                    </Segment>
                    <Segment basic>
                        <DataRenderer cards={_cards} {...this.props} />
                    </Segment>
            </Container>
        )
    }
}

export default hot(module)(App);
