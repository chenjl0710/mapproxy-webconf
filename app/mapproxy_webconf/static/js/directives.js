/**
 * Makes a list sortable
 *
 * Example:
 * <ul sortable to-sort="layer_list">
 *     <li ng-repeat="item in sortable_array">{{item.name}}<button class="btn btn-mini btn-danger" style="float:right;" ng-click="remove(item)">X</button></li>
 * </ul>
 * <button ng-click="add()">Add</button>
 *
 * the add function defined in an sorounding controller:
 * $scope.add = function() {
 *     $scope.layer_list.push({"id": 99, "name": "New"});
 * }
 *
 * layer_list is a list of dicts
 * insiede the directive you must work with sortable_array
 * instead of the outer list layer_list
 *
 * if you wish to use functions inside the directive like
 * remove, they must be defined inside the directive
 *
 * ToDo:
 * figger out how to access methods of directive from
 * outside like add so the outer list layer_list hasn't
 * to manipulate by controller but by directive
 */

angular.module('mapproxy_gui.directives', []).
directive('sortable', function() {
    return {
        restrict: 'A',
        replace: false,
        require: 'ngModel',
        link: function(scope, element, attrs, ngModelCtrl) {

            scope.dragStart = function(e, ui) {
                ui.item.data('start', ui.item.index());
            };

            scope.dragEnd = function(e, ui) {
                //old item list index
                var start = ui.item.data('start');
                //new item list index
                var end = ui.item.index();
                scope.items = ngModelCtrl.$modelValue;

                if(angular.isUndefined(scope.items)) {
                    scope.items = [];
                }
                //rearrange list
                scope.items.splice(end, 0,
                    scope.items.splice(start, 1)[0]);

                //tell angular $scope has changed
                scope.$apply()
            };

            scope.remove = function(item) {
                scope.items = ngModelCtrl.$modelValue;
                scope.items.splice(scope.items.indexOf(item), 1);
                if(scope.items.length == 0) {
                    ngModelCtrl.$setViewValue(undefined);
                }
            };

            var sortable_element = $(element).sortable({
                start: scope.dragStart,
                update: scope.dragEnd
            });
        }
    };
}).

/* Drag&Drop directives */
directive('draggable', function() {
    return {
        // A = attribute, E = Element, C = Class and M = HTML Comment
        restrict:'A',
        //The link function is responsible for registering DOM listeners as well as updating the DOM.
        link: function(scope, element, attrs) {
            $(element).draggable({
                helper: 'clone',
                cursor: 'move',
                revert: false
            });
        }
    };
}).

/**
 * Insertable directive
 *
 * Usable as attribute: <div insertable ...
 * requires ng-model
 *
 * change: function
 * - fired on value change.
 * - must provide a callback parameter for callback function
 * - callback(true) accept change
 * - callback(false) reject change
 *
 * allow-array: boolean
 * - true to allow insert arrays
 * accepts: string - comma seppareted string for list
 * - classname(s) of elements allowed to insert
 */
 //TODO: allow setting accepts
directive('droppable', function($parse) {
    return {
        restrict: 'A',
        require: 'ngModel',
        link: function(scope, element, attrs, ngModelCtrl) {
            //create a new not isolated scope
            scope = scope.$new(false)

            scope.checkExist = function(item) {
                var exist = false;
                if(scope.use_key) {
                    item = item[scope.use_key];
                }
                //because angular add a unique $$hashKey to objects
                angular.forEach(scope.items, function(scope_item) {
                    //angular.forEach doesn't support break
                    if(!exist) {
                        exist = angular.equals(scope_item, item);
                    }
                });
                if(!exist) {
                    scope.to_insert.push(item);
                }
            };
            scope.checkClass = function(elem) {
                var found = false;

                if(scope.accepts.length == 0) return true

                angular.forEach(scope.accepts, function(accept) {
                    if(!found) {
                        found = elem.hasClass(accept);
                    }
                });
                return found;
            };
            scope.insertItems = function() {
                if(angular.isUndefined(scope.items)) {
                    scope.items = [];
                }
                if(attrs.allowArray) {
                    scope.items = scope.items.concat(scope.to_insert);
                } else {
                    scope.items = scope.to_insert[0];
                }
                delete(scope.j_ui);
                scope.$apply(function() {
                    ngModelCtrl.$setViewValue(scope.items);
                });
            };
            scope.remove = function(item) {
                if(angular.isUndefined(scope.items) || angular.isUndefined(item)) {
                    return;
                }

                if(attrs.allowArray) {
                    scope.items.splice(scope.items.indexOf(item), 1);
                    if(scope.items.length == 0) {
                        scope.items = undefined;
                    }
                } else {
                    scope.items = undefined;
                }

                scope.$apply(function() {
                    ngModelCtrl.$setViewValue(scope.items);
                });
            };
            scope.changeCallback = function(change) {
                if(change) {
                    scope.insertItems();
                } else {
                    scope.j_ui.draggable('option', 'revert', true);
                }
            };
            scope.dropHandler = function(event,ui) {
                //get current items from model
                scope.items = ngModelCtrl.$modelValue;
                scope.inserted = false;
                scope.j_ui = $(ui.draggable);
                //only process draggable elements
                if(!scope.j_ui.hasClass('ui-draggable')) {
                    return;
                }

                //check element class against accepts
                if(!scope.checkClass(scope.j_ui)) {
                    scope.j_ui.draggable('option', 'revert', true);
                    return;
                }
                //get data (string) of dopped element and convert it to an object
                scope.new_item = angular.fromJson(scope.j_ui.attr('item-data'));
                scope.to_insert = [];
                //check for data
                if(!angular.isUndefined(scope.new_item)) {
                    //check for existing items
                    if(angular.isArray(scope.new_item)) {
                        angular.forEach(scope.new_item, scope.checkExist);
                    } else {
                        scope.checkExist(scope.new_item);
                    }
                    //look if something to insert
                    if(scope.to_insert.length > 0) {
                        //run callback if present
                        if(angular.isFunction(scope.change)) {
                            scope.change(scope.$parent, {callback: scope.changeCallback, new_data: scope.new_item});
                        } else {
                            scope.insertItems();
                        }
                    } else {
                        scope.j_ui.draggable('option', 'revert', true);
                    }
                }
            };

            if(angular.isUndefined(attrs.accepts)) {
                scope.accepts = [];
            } else {
                scope.accepts = attrs.accepts.split(',');
            }
            scope.use_key = attrs.useKeyForValue;

            //look for callback function
            if(!angular.isUndefined(attrs.changeCallback)) {
                scope.change = $parse(attrs.changeCallback);
            }

            $(element).droppable({
                drop: scope.dropHandler
            });
        }
    };
}).

directive('toggleGroup', function() {
    return {
        restrict: 'A',
        controller: toggleGroupCtrl
    };
}).

directive('toggleElement', function() {
    return {
        restrict: 'A',
        require: '^toggleGroup',
        link: function(scope, element, attrs, toggleGroupCTRL) {
            toggleGroupCTRL.addElement(element);
            $(element).click(function() {
                toggleGroupCTRL.getToggleFunc()(element);
            });
        }
    }
}).

directive('tabs', function() {
    return {
        restrict: 'A',
        transclude: true,
        scope: {},
        controller: tabsCtrl,
        template:
            '<div class="tabbable">' +
            '<ul class="nav nav-tabs">' +
            '<li ng-repeat="pane in panes" ng-class="{active:pane.selected}">'+
            '<a href="" ng-click="select(pane)">{{pane.header}}</a>' +
            '</li>' +
            '</ul>' +
            '<div class="tab-content" ng-transclude></div>' +
            '</div>',
        replace: true
    };
}).

directive('pane', function() {
    return {
        require: '^tabs',
        restrict: 'A',
        transclude: true,
        scope: { header: '@' },
        link: function(scope, element, attrs, tabsCtrl) {
            tabsCtrl.addPane(scope);
        },
        template:
            '<div class="tab-pane" ng-class="{active: selected}" ng-transclude></div>',
        replace: true
    };
}).

directive('askDialog', function($parse) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {

            scope.openDialog = function() {
                $('#dialog_' + scope.dialog_id).dialog({
                    resizeable: false,
                    width: 400,
                    height: 200,
                    model: true,
                    buttons: {
                        "Yes": function() {
                            $(this).dialog("close");
                            scope.callback(scope);
                        },
                        "No": function() {
                            $(this).dialog("close");
                        }
                    }
                });
            };
            scope.dialog_id = scope.$id;
            scope.callback = $parse(attrs.callback);
            var dialog = '<div style="display:none;" id="dialog_' + scope.dialog_id + '" title="'+ attrs.dialogTitle +'"><p>'+ attrs.dialogText +'</p></div>';
            element.after(dialog);

            element.bind('click', scope.openDialog);
        }
    };
}).

directive('labeledControlGroup', function() {
    return {
        restrict: 'A',
        replace: true,
        transclude: true,
        template: '<div class="control-group">' +
                      '<label class="control-label" for="{{name}}">{{text}}:</label>' +
                      '<div class="controls">' +
                          '<span ng-transclude></span>' +
                          '<span ng-show="showWarning()" id="tooltip_{{$id}}" class="icon-warning-sign warning_icon"></span>' +
                      '</div>' +
                  '</div>',
        scope: 'element',
        link: function(scope, element, attrs) {
            scope.showWarning = function() {
                if(scope.warning) {
                    element.addClass('warning');
                    $('#tooltip_'+ scope.$id).tooltip({
                        placement: 'right',
                        title: scope.warningMsg
                    });
                    return true;
                } else {
                    element.removeClass('warning');
                    return false;
                }
            };
            scope.warningMsg = function() {
                return attrs.warningMsg;
            };

            scope.name = attrs.nameFor;
            scope.text = attrs.text;
            if(angular.isDefined(attrs.$attr.warning)) {
                scope.warning_msg = attrs.warningMsg;
                attrs.$observe('warning', function(val) {
                    scope.warning = val == 'true';
                });
            }
        }
    };
});

/* Controller for directives */

// used by toggleGroup
var toggleGroupCtrl = function($scope, $element) {
    var toggle_elements = [];

    var toToggle = function(element) {
        switch(element.attr('toggle-element')) {
            case 'next':
                return $(element).next();
                break;
            default:
                return $(element);
        }
    };

    this.addElement = function(element) {
        toggle_elements.push(element);
    };
    this.getElementCount = function() {
        return toggle_elements.length;
    };

    this.multiShow = function(element) {
        toToggle(element).toggle();
    };
    this.hideOther = function(element) {
        angular.forEach(toggle_elements, function(t_element) {
            if (t_element == element) {
                toToggle(t_element).show();
            } else {
                toToggle(t_element).hide();
            }
        });
    };
    this.getToggleFunc = function() {
        switch($element.attr('mode')) {
            case 'multiShow':
                return this.multiShow;
                break;
            case 'hideOther':
            default:
                return this.hideOther;
        }
    };
}

// used by tabs
var tabsCtrl = function($scope, $element) {

    this.addPane = function(pane) {
        if (panes.length == 0) $scope.select(pane);
        panes.push(pane);
    };

    $scope.select = function(pane) {
        angular.forEach(panes, function(pane) {
            pane.selected = false;
        });
        pane.selected = true;
    };

    var panes = $scope.panes = [];
};