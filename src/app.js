/* eslint-disable import/first */

import React, { Component } from "react"
import _ from "lodash"
import TimeAgo from "react-timeago"

// Semantic UI
import { Container, Label, Popup, Menu, Segment, Sidebar, Dropdown } from "semantic-ui-react"
import "semantic-ui-css/semantic.min.css"

// Boostrap for BootstrapTable
import { BootstrapTable, TableHeaderColumn } from "react-bootstrap-table"
import "react-bootstrap-table/dist/react-bootstrap-table-all.min.css"
import "bootstrap/dist/css/bootstrap.min.css"

// jQuery
import jquery from "jquery"
window.$ = window.jQuery = jquery

// Trello
import { Trello } from "./vendors/trello.js"
window.Trello = Trello

import "./app.css"
import { cardLabelsRank, labelsSort, dateSort, oneWeekAway } from './utils';


class App extends Component {
  constructor() {
    super()
    this.state = {
      cards: [],
      organizations: [],
      users: {},
      selectedOrg: "all",
      selectedUser: {}
    }

    // Authorization to fetch data from Trello
    Trello.authorize({
      name: "Today for Trello",
      type: "redirect",
      interactive: true,
      expiration: "never",
    })

    // Get all cards across boards
    var self = this

    Trello.get("members/me", function(me) {
      self.setState({selectedUser: me});
    })

    Trello.get("members/me/organizations", function(orgs) {
      self.setState({organizations: orgs});
    })

    Trello.get("members/me/boards?filter=open", function(boards) {
      for(let b of boards) {
        Trello.get(`boards/${b.id}/members`, function(members) {
          for(let m of members) {
            self.state.users[m.id] = m;
          }
        })

        Trello.get(`boards/${b.id}/cards?filter=open`, function(cards) {
          var new_cards = [];
          for(let card of cards) {
            // Update fields
            card.board = b.name
            card.idOrganization = b.idOrganization
            card.labels = _.reverse(_.sortBy(card.labels, cardLabelsRank))
            if (card.due !== null)
              card.due = new Date(card.due);

            new_cards.push(card)
          }

          new_cards = self.state.cards.concat(new_cards)
          var [block_due, block_then] = _.partition(new_cards, oneWeekAway)
          new_cards = _.concat(
            _.orderBy(block_due, ['due', cardLabelsRank], ['asc', 'asc']),
            _.orderBy(block_then, [cardLabelsRank, 'due'], ['asc', 'asc']),
          )
          self.setState({ cards: new_cards})
        })
      }
    })
  }

  labelsFormatter(labels) {
    const content = labels.map(l => (
      <Popup key={l.id} trigger={<Label circular empty color={l.color} key={l.color} />} content={l.name} />
    ))
    return <div>{content}</div>
  }

  dueFormater(due) {
    return (due === null) ? <p /> : <TimeAgo date={due} />
  }

  boardFormatter(board, row) {
    return <a href={`https://trello.com/b/${row.idBoard}`}>{board}</a>
  }

  nameFormater(name, row) {
    return <strong><a href={row.url} target="_blank">{name}</a></strong>
  }

  renderTableNew(cards) {
    const { selectedOrg, selectedUser } = this.state

    if (selectedOrg !== "all")
      cards = _.filter(cards, c => c.idOrganization === selectedOrg)
    if (selectedUser !== null)
      cards = _.filter(cards, c => c.idMembers.includes(selectedUser.id))

    return (
      <BootstrapTable data={cards} striped={false} hover={true} bordered={false} multiColumnSort={2}>
        <TableHeaderColumn autoValue={true} dataField="id" isKey={true} hidden={true}>
          Id
        </TableHeaderColumn>
        <TableHeaderColumn
          width="10%"
          dataField="labels"
          dataFormat={this.labelsFormatter}
          dataSort={true}
          sortFunc={labelsSort}>
          {" "}
          Labels
        </TableHeaderColumn>
        <TableHeaderColumn dataField="board" dataSort={true}>
          Board
        </TableHeaderColumn>
        <TableHeaderColumn dataField="due" dataSort={true} sortFunc={dateSort} dataFormat={this.dueFormater}>
          Due date
        </TableHeaderColumn>
        <TableHeaderColumn width="60%" dataFormat={this.nameFormater} dataField="name">
          Card
        </TableHeaderColumn>
      </BootstrapTable>
    )
  }

  handleOrgClick(index) {
    return () => this.setState({ selectedOrg: index })
  }

  handleUserClick() {
    return (err, event) => {
      const user = _.find(this.state.users,  u => u.id === event.value)
      this.setState({selectedUser: user})
    }
  }

  render() {
    const { selectedOrg, selectedUser, organizations, users } = this.state

    const options = _.map(users, (u, id) => ({key: u.id, text: u.fullName, value: u.id}))
    const trigger = (
      <Menu.Item key="user" className="select-user-label">
        {selectedUser.fullName}
      </Menu.Item>
    )

    return (
      <Container fluid={true}>
        <Sidebar as={Menu} width="thin" visible={true} vertical>
          <Dropdown trigger={trigger} options={options}
                    icon='angle double down' fluid className="select-user"
                    onChange={this.handleUserClick()} value={selectedUser.displayName}>
          </Dropdown>

          <Menu.Item key="all" active={selectedOrg === "all"}
                     onClick={this.handleOrgClick("all")}>
            All organizations
          </Menu.Item>
          <Menu.Item key="perso" active={selectedOrg === null}
                     onClick={this.handleOrgClick(null)}>
            Personal
          </Menu.Item>

          {organizations.map(org => (
            <Menu.Item key={org.id} active={selectedOrg === org.id}
                       onClick={this.handleOrgClick(org.id)}>
              {org.displayName}
            </Menu.Item>
          ))}
        </Sidebar>
        <Sidebar.Pusher>
          <Segment basic>{this.renderTableNew(this.state.cards)}</Segment>
        </Sidebar.Pusher>
      </Container>
    )
  }
}

export default App
