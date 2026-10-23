'use strict';

const test = require('node:test');
const assert = require('node:assert');
const maintenance = require('./maintenance');

test('chat archive drops the oldest chats past the cap and keeps the newest', () => {
    const archive = {};
    for (let i = 0; i < 5; i++) archive[`chat${i}@s.whatsapp.net`] = ['x'];
    const removed = maintenance.boundChatArchive(archive, 3);
    assert.equal(removed, 2);
    assert.deepEqual(Object.keys(archive), ['chat2@s.whatsapp.net', 'chat3@s.whatsapp.net', 'chat4@s.whatsapp.net']);
});

test('chat archive does nothing while under the cap', () => {
    const archive = { 'a@s.whatsapp.net': ['x'] };
    assert.equal(maintenance.boundChatArchive(archive, 150), 0);
    assert.deepEqual(Object.keys(archive), ['a@s.whatsapp.net']);
});

test('learned style and facts are capped per person count', () => {
    const style = {}, facts = {};
    for (let i = 0; i < 4; i++) {
        style[`s${i}`] = { msgs: i };
        facts[`f${i}`] = ['my name is test'];
    }
    const removed = maintenance.boundLearning(style, facts, 2);
    assert.equal(removed, 4);
    assert.deepEqual(Object.keys(style), ['s2', 's3']);
    assert.deepEqual(Object.keys(facts), ['f2', 'f3']);
});

test('antidelete retention is 24 hours private and 1 hour for groups', () => {
    assert.equal(maintenance.antideleteTtl('234900@s.whatsapp.net'), 24 * 60 * 60 * 1000);
    assert.equal(maintenance.antideleteTtl('12345-67890@g.us'), 1 * 60 * 60 * 1000);
    assert.equal(maintenance.antideleteTtl(''), 24 * 60 * 60 * 1000);
});

test('the connect chat list is bounded to the newest 300 chats', () => {
    const chats = {};
    for (let i = 0; i < 350; i++) chats[`c${i}@s.whatsapp.net`] = { id: `c${i}@s.whatsapp.net` };
    const bounded = maintenance.boundChatSet(chats);
    const keys = Object.keys(bounded);
    assert.equal(keys.length, 300);
    assert.equal(keys[0], 'c50@s.whatsapp.net');
    assert.equal(keys[299], 'c349@s.whatsapp.net');
});
