(function() {
  'use strict';

  angular.module('begriffs.paginate-anything', []).

    directive('pagination', function () {
      return {
        restrict: 'E',
        scope: {
          url: '@',
          headers: '&',
          collection: '=',

          page: '=?',
          perPage: '=?',
          perPagePresets: '=?',
          numPages: '=?',
          numItems: '=?'
        },
        templateUrl: 'tpl/paginate-anything.html',
        replace: true,
        controller: ['$scope', '$http', function($scope, $http) {

          $scope.paginated      = false;
          $scope.perPagePresets = [25, 50, 100, 200];
          $scope.serverLimit    = Infinity; // it's not known yet

          function gotoPage(i) {
            var pp = $scope.perPage || 100;
            $scope.page = i;
            requestRange(i * pp, (i+1) * pp - 1);
          }

          function requestRange(reqFrom, reqTo) {
            $http({
              method: 'GET',
              url: $scope.url,
              headers: angular.extend(
                {}, $scope.headers,
                { 'Range-Unit': 'items', Range: [reqFrom, reqTo].join('-') }
              )
            }).success(function (data, status, headers) {
              $scope.collection = data;

              var response = parseRange(headers('Content-Range'));

              $scope.numItems = response ? response.total : data.length;

              if(response && length(response) < response.total) {
                $scope.paginated = true;

                if(
                  (reqTo       < response.total - 1) ||
                  (response.to < response.total - 1 &&
                                 response.total < reqTo)
                ) {
                  $scope.perPage = length(response);
                  $scope.serverLimit = length(response);
                }
                $scope.numPages = Math.ceil(response.total / length(response));
              }
            });
          }

          gotoPage($scope.page || 0);

          $scope.$watch('page', function(newPage, oldPage) {
            if(newPage !== oldPage) {
              gotoPage(newPage);
            }
          });

          $scope.$watch('perPage', function(newPp, oldPp) {
            if(typeof(oldPp) === 'number' && newPp !== oldPp) {
              var middle = ($scope.page + 0.49) * oldPp;
              gotoPage(Math.floor(Math.min($scope.numItems - 1, middle) / newPp));
            }
          });

          $scope.$watch('serverLimit', function(newLimit, oldLimit) {
            if(newLimit !== oldLimit) {
              var level, limit = newLimit, presets = [];
              for(level = 0; level < 4; level++) {
                presets.unshift(5 * Math.round(limit / 5));
                limit = limit / 2;
              }
              $scope.perPagePresets = presets;
            }
          });

        }],
      };
    });


  function parseRange(hdr) {
    var m = hdr && hdr.match(/^(\d+)-(\d+)\/(\d+|\*)$/);
    if(!m) { return null; }
    return {
      from: +m[1],
      to: +m[2],
      total: m[3] === '*' ? Infinity : +m[3]
    };
  }

  function length(range) {
    return range.to - range.from + 1;
  }
}());
