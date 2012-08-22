/*jslint node:true*/
/*
 * GET home page.
 */

"use strict";

exports.index = function (req, res) {
    res.render('index', { title: 'Snake Online' });
};
