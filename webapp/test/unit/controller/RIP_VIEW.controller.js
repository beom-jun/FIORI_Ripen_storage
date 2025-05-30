/*global QUnit*/

sap.ui.define([
	"ripeninig/ripeninig/controller/RIP_VIEW.controller"
], function (Controller) {
	"use strict";

	QUnit.module("RIP_VIEW Controller");

	QUnit.test("I should test the RIP_VIEW controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
