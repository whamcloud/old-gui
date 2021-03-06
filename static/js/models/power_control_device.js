//
// Copyright (c) 2018 DDN. All rights reserved.
// Use of this source code is governed by a MIT-style
// license that can be found in the LICENSE file.


(function (_) {
  'use strict';

  function PowerControlDeviceModel(baseModel, PowerControlDeviceOutlet) {
    /**
     * @description Flattens nested device resources before save or update to server.
     * @param {object} data
     * @returns {string}
     */
    function transformRequest(data) {
      var flatData = _.cloneDeep(data);
      //flatten outlets.
      flatData.outlets = _.pluck(data.outlets, 'resource_uri');
      //flatten device_type.
      flatData.device_type = data.device_type.resource_uri;

      return angular.toJson(flatData);
    }

    /**
     * @description sorts a device's outlets then turns each into a PowerControlDeviceOutlet instance.
     * @param {PowerControlDeviceModel} device
     */
    function vivifyOutlets(device) {
      device.outlets.sort(function (a, b) {
        var v1 = a.identifier;
        var v2 = b.identifier;

        if (v1 === v2) {
          return 0;
        }

        return v1 < v2 ? -1 : 1;
      });

      device.outlets = device.outlets.map(function (outlet) {
        return new PowerControlDeviceOutlet(outlet);
      });
    }

    /**
     * @description Represents a power control device and it's outlets.
     * @class PowerControlDeviceModel
     * @returns {PowerControlDeviceModel}
     * @constructor
     */
    return baseModel({
      url: '/api/power_control_device/:powerControlDeviceId',
      params: {powerControlDeviceId: '@id'},
      actions: {
        query: {
          interceptor: {
            response: function (resp) {
              resp.resource.forEach(vivifyOutlets);

              return resp.resource;
            }
          }
        },
        save: {
          transformRequest: transformRequest,
          interceptor: {
            response: function (resp) {
              vivifyOutlets(resp.resource);

              return resp.resource;
            }
          }
        },
        update: {
          transformRequest: transformRequest,
          interceptor: {
            response: function (resp) {
              vivifyOutlets(resp.resource);

              return resp.resource;
            }
          }
        }
      },
      methods: {
        /**
         * Returns a flat list of what outlets are assigned at the intersection of a host and pdu.
         * @param {object} host
         * @returns {Array}
         */
        getOutletHostIntersection: function (host) {
          return this.outlets.filter(function (outlet) {
            return outlet.host === host.resource_uri;
          });
        },
        /**
         * Returns a list of outlets that do not have a host.
         * @returns {Array}
         */
        getUnassignedOutlets: function () {
          return this.outlets.filter(function (outlet) {
            return outlet.host == null;
          });
        },
        /**
         * Removes the outlet from it's host.
         * @param {PowerControlDeviceOutlet} outlet
         * @returns {*}
         */
        removeOutlet: function (outlet) {
          outlet.host = null;
          return outlet.$update();
        },
        /**
         * Have to wrap this because of the broken promise $parse implementation in Angular 1.2 RC2
         * Remove when 1.2 RC3 is released. See {@link https://github.com/angular/angular.js/pull/4317|issue}.
         * @param {PowerControlDeviceOutlet} outlet
         * @returns {*}
         */
        removeOutletWrapped: function (outlet) {
          outlet.host = null;
          var promise = outlet.$update();

          return function () { return promise; };
        },
        removeIpmiOutlet: function (outlet) {
          outlet.host = null;
          return outlet.$delete().then(function () {
            var outletIndex = this.outlets.indexOf(outlet);
            this.outlets.splice(outletIndex, 1);
          }.bind(this));
        },
        /**
         * Have to wrap this because of the broken promise $parse implementation in Angular 1.2 RC2
         * Remove when 1.2 RC3 is released. See {@link https://github.com/angular/angular.js/pull/4317|issue}.
         * @param {PowerControlDeviceOutlet} outlet
         * @returns {*}
         */
        removeIpmiOutletWrapped: function (outlet) {
          outlet.host = null;
          var promise = outlet.$delete().then(function () {
            var outletIndex = this.outlets.indexOf(outlet);
            this.outlets.splice(outletIndex, 1);
          }.bind(this));

          return function () { return promise; };
        },
        /**
         * Adds an outlet to a host.
         * @param {PowerControlDeviceOutlet} outlet
         * @param {hostModel} host
         * @returns {*}
         */
        addOutlet: function (outlet, host) {
          outlet.host = host.resource_uri;
          return outlet.$update();
        },
        /**
         * Have to wrap this because of the broken promise $parse implementation in Angular 1.2 RC2
         * Remove when 1.2 RC3 is released. See {@link https://github.com/angular/angular.js/pull/4317|issue}.
         * @param outlet
         * @param host
         * @returns {Function}
         */
        addOutletWrapped: function (outlet, host) {
          outlet.host = host.resource_uri;
          var promise = outlet.$update();

          return function () { return promise; };
        },
        format: function (value) {
          return _.pluck(value, 'identifier');
        },
        isIpmi: function () {
          return this.device_type.max_outlets === 0;
        }
      }
    });
  }

  angular.module('models')
    .factory('PowerControlDeviceModel', ['baseModel', 'PowerControlDeviceOutlet', PowerControlDeviceModel]);
}(window.lodash));

