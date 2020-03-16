import React, { Component } from "react"
import _ from "lodash"

import { hot } from 'react-hot-loader'

// jQuery
import jquery from "jquery"
window.$ = window.jQuery = jquery

// Trello
import { Trello } from "./vendors/trello.js"
window.Trello = Trello

// Semantic UI
import { Container, Segment } from "semantic-ui-react"

// Routing
import Navigo from 'navigo'

import {cardLabelsRank, oneWeekAway} from "./utils"
import { TrelloAutosuggest } from './TrelloAutosuggest'
import { DataRenderer } from './DataRenderer'

import "./app.css"
import "semantic-ui-css/semantic.min.css"

class App extends Component {
    constructor(props) {
        super(props)
        this.state = {
            cards: [],
            organizations: {},
            boards: {},
            users: {},
            lists: {},

            selectedName: "",
            me: null,
            route: null
        }
    }

    componentDidMount() {
        // Initialize routing
        this.router = new Navigo(null, true, '#!')

        // Authorization to fetch data from Trello
        Trello.authorize({
            name: "Today for Trello",
            type: "redirect",
            interactive: true,
            expiration: "never",
        })

        function abbrUsername(fullName) {
            const splittingPattern = /[^a-zA-Z]/g

            let abbr = fullName.split(splittingPattern).map(x => x.charAt(0)).join('').substr(0, 2).toUpperCase()
            if (abbr.length < 2)
                abbr = fullName.replace(splittingPattern, '').substr(0, 2).toUpperCase()            
            if (abbr.length === 0)
                abbr = "??"

            return abbr
        }

        // Fetch all cards, users, organizations from Trello
        let self = this
        const urls = ["/members/me", "/members/me/organizations", "/members/me/boards%3Ffilter=open%26lists=open"]
        Trello.get(`batch?urls=${urls.join()}`).then(function(data){
            const [ {200: me}, {200: orgs}, {200: boards} ] = data

            self.setState({ organizations: _.keyBy(orgs, 'id'), boards: _.keyBy(boards, 'id') })

            const boardsMembersURLs = boards.map((b) => `/boards/${b.id}/members`)
            const boardsCardsURLs = boards.map((b) => `/boards/${b.id}/cards%3Ffilter=open`)
            const boardsListsURLs = boards.map((b) => `/boards/${b.id}/lists%3Ffilter=open`)

            Trello.get(`batch?urls=${boardsMembersURLs.join()}`).then(function(data) {
                let allMembers = _.unionBy(...(data.map((d) => d[200])), 'id')

                allMembers = _.map(
                    allMembers,
                    (key) => ({...key, abbr: abbrUsername(key.fullName)})
                )
                self.setState({users: _.keyBy(allMembers, 'id')})

                Trello.get(`batch?urls=${boardsListsURLs.join()}`).then(function(data) {
                    const allLists = _.unionBy(...(data.map((d) => d[200])), 'id')
                    self.setState({lists: _.keyBy(allLists, 'id')})

                    Trello.get(`batch?urls=${boardsCardsURLs.join()}`).then(function(data) {
                        let allCards = _.flatten(data.map((d) => d[200]))
                        allCards = allCards.map((card) => ({
                            ...card,
                            board: self.state.boards[card.idBoard].name,
                            users: _.map(card.idMembers, function (id) {return self.state.users[id].abbr}).join(", "),
                            labels: _.sortBy(card.labels, cardLabelsRank), due: card.due ? new Date(card.due) : null
                        }))

                        let [block_due, block_then] = _.partition(allCards, oneWeekAway)
                        allCards = _.concat(
                            _.orderBy(block_due, ['due', cardLabelsRank], ['asc', 'asc']),
                            _.orderBy(block_then, [cardLabelsRank, 'due'], ['asc', 'asc']),
                        )

                        allCards = allCards.filter((c) => c.idList in self.state.lists);
                        self.setState({ cards: allCards})
                    }).then(() =>
                        self.router
                            .on('/user/:id', (params) => self.selectRoute('user', params.id) )
                            .on('/board/:id', (params) => self.selectRoute('board', params.id) )
                            .on('/org/:id', (params) => self.selectRoute('org', params.id) )
                            .on('*', () => self.router.navigate(`/user/${me.id}`) )
                            .resolve()
                    )
                })
            })
        })
    }

    updateWindowTitle() {
        if(this.state.selectedName !== undefined)
            window.document.title = `${this.state.selectedName} | Today for Trello`
        else
            window.document.title = "Today for Trello"
    }

    selectRoute(category, id) {
        this.setState({route: {category: category, id: id}})
        try {
            let selectedName =
                ((category == 'user') && this.state.users[id].fullName) ||
                ((category == 'board') && this.state.boards[id].name) ||
                ((category == 'org') && this.state.organizations[id].displayName)
            this.setState({selectedName: selectedName})
            this.updateWindowTitle()
        } catch (error) { }
    }

    onSuggestionSelected(_, e) {
        this.router.navigate(`#!/${e.suggestion.type}/${e.suggestion.id}`)
    }

    render() {
        const { cards, users, organizations, boards } = this.state

        const options = _.map(users, (u) => (
            {key: u.id, text: u.fullName, value: u.id, to: '/user/' + u.id}
        ))
        options.sort((a, b) => a.text.localeCompare(b.text))

        const uniqueUsers = _.map(users, (u) => ({name: u.fullName, type: 'user', id: u.id}))
        const uniqueBoards = _.map(boards, (b) => ({name: b.name, type: 'board', id: b.id}))
        const uniqueOrgs =  _.map(organizations, (o) => ({name: o.displayName, type: 'org', id: o.id}))

        const suggestions = [
            { title: 'Users', options: uniqueUsers },
            { title: 'Organizations', options: uniqueOrgs },
            { title: 'Boards', options: uniqueBoards }
        ]

        let _cards = cards
        if(this.state.route && this.state.route.category == 'user')
            _cards = this.state.cards.filter((c) => c.idMembers.includes(this.state.route.id))
        else if(this.state.route && this.state.route.category == 'board')
            _cards = this.state.cards.filter((c) => c.idBoard == this.state.route.id)
        else if(this.state.route && this.state.route.category == 'org')
            _cards = this.state.cards.filter((c) => boards[c.idBoard].idOrganization == this.state.route.id)
        return (
            <Container fluid={true}>
                <Segment basic>
                    <TrelloAutosuggest trelloOptions={suggestions}
                        onSuggestionSelected={this.onSuggestionSelected.bind(this)}
                        value={this.state.selectedName} />
                </Segment>
                <Segment basic>
                    <DataRenderer cards={_cards} {...this.props} />
                </Segment>
            </Container>
        )
    }
}

export default hot(module)(App)
