/**
 * Refactored by nirkaufman on 1/4/15.
 */
(function () {

  function SecurityWorkspace($stateParams, SecurityService, SecurityMatrixService, NotificationService, $filter) {

    var self = this;

    /**
     * Init the workspaces = security templates page
     */
    (function init() {
      var appName = SecurityMatrixService.appName = SecurityService.appName = $stateParams.appName;
      self.workspaces = null;
      self.templateChanged = templateChanged;
      self.templateRoleAdd = templateRoleAdd;
      self.templateRoleRename = templateRoleRename;
      self.templateRoleRemove = templateRoleRemove;
      self.processingNewWS = false;
      self.defaultWorkspaceName = 'Public';
      getWorkspaces();
    }());

    self.changeName = function (newName, wsId) {
      SecurityService.updateWorkspace(
        {
          __metadata: {id: wsId},
          workspaceName: newName
        }
      )
    };
    function templateRoleAdd (roleName){
      return SecurityService.postRole({Name: roleName, Description: roleName})
        .then(function (data) {
          getWorkspaces();
          return data;
      })
    }

    function  templateRoleRename(roleName, newName){
      return SecurityService.updateRole({Name: newName, Description: newName}, roleName)
        .then(function (data) {
          getWorkspaces();
          return data;
      })
    }

    function templateRoleRemove(roleName){
      return SecurityService.deleteRole(roleName)
        .then(function (data) {
          getWorkspaces();
          return data;
      })
    }

    function templateChanged(template, wsId) {
      if (template) {

        //console.log('callback function, template changed: ', template);
        var permissions = SecurityMatrixService.getPermission(template);

        var workspace = $filter('filter')(self.workspaces, function (w) {
          return w.__metadata.id === wsId;
        })[0];

        workspace.allowCreate = permissions.allowCreate;
        workspace.allowEdit = permissions.allowEdit;
        workspace.allowDelete = permissions.allowDelete;
        workspace.allowRead = permissions.allowRead;

        SecurityService.updateWorkspace(workspace);
      }
    }

    /**
     * Read the list of workspaces
     */
    function getWorkspaces() {
      SecurityService.getWorkspace()
        .then(workspaceSuccessHandler, errorHandler);
    }

    /**
     *
     */
    self.addWorkspace = function () {
      self.processingNewWS =true;
      var newWorkspaceName = getNewWorkspaceName();
      var newWS = {

        allowCreate: "Developer,Admin",
        allowDelete: "Developer,Admin",
        allowEdit: "Developer,Admin",
        allowRead: "Developer,Admin",
        overridepermissions: true,
        workspaceName: newWorkspaceName
      };

      self.defaultWorkspaceName = newWorkspaceName;
      SecurityService.postWorkspace(newWS)
        .then(getWorkspaces,errorHandler);

    };

    /**
     *
     * @param data
     * @returns {*}
     * @constructor
     */
    function workspaceSuccessHandler(data) {
      self.workspaces = data.data.data;
      self.loading = true;
      angular.forEach(self.workspaces, function (workspace) {
        var permissions = {};
        permissions.allowCreate = workspace.allowCreate;
        permissions.allowEdit = workspace.allowEdit;
        permissions.allowDelete = workspace.allowDelete;
        permissions.allowRead = workspace.allowRead;
        workspace.tabActive = (workspace.workspaceName == self.defaultWorkspaceName);
        SecurityMatrixService.loadMatrix(permissions)
          .then(function (data) {
          workspace.template = data;
        });
      });
      self.processingNewWS=false;

    }

    function getNewWorkspaceName() {
      var notFound = true;
      var exits = false;
      var counter = 0;
      var newWorkspaceName = "Security Template";

      if (self.workspaces && self.workspaces.length) {
        while (notFound) {
          exits = false;
          angular.forEach(self.workspaces, function (workspace) {
            if (workspace.workspaceName == newWorkspaceName + (counter == 0 ? "" : " " + String(counter))) {
              exits = true;
            }
          });
          if (exits) {

            counter++;
          }
          else {
            notFound = false;
          }
        }
      }
      return newWorkspaceName + (counter == 0 ? "" : " " + String(counter));
    }

    function errorHandler(error, message) {
      NotificationService.add('error', message);
      self.processingNewWS=false;
    }
  }

  angular.module('backand')
    .controller('SecurityWorkspace', [
      '$stateParams',
      'SecurityService',
      'SecurityMatrixService',
      'NotificationService',
      '$filter',
      SecurityWorkspace
    ]);

}());
