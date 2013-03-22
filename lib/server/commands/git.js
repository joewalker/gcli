/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var main = require('../../../gcli');

var Promise = main.require('util/promise');

var gcli = main.require('gcli/index');
var types = main.require('gcli/types');
var Type = main.require('gcli/types').Type;
var Conversion = main.require('gcli/types').Conversion;

/**
 * Registration and de-registration.
 */
exports.startup = function(data, reason) {
  types.registerType(commitObject);
  types.registerType(existingFile);

  gcli.addCommand(git);
  gcli.addCommand(gitAdd);
  gcli.addCommand(gitCommit);
};

exports.shutdown = function(data, reason) {
  gcli.removeCommand(git);
  gcli.removeCommand(gitAdd);
  gcli.removeCommand(gitCommit);

  types.unregisterType(commitObject);
  types.unregisterType(existingFile);
};


/**
 * commitObject really needs some smarts, but for now it is a clone of string
 */
var commitObject = new Type();

commitObject.stringify = function(value, context) {
  return value;
};

commitObject.parse = function(arg, context) {
  return Promise.resolve(new Conversion(arg.text, arg));
};

commitObject.name = 'commitObject';

/**
 * existingFile really needs some smarts, but for now it is a clone of string
 */
var existingFile = new Type();

existingFile.stringify = function(value, context) {
  return value;
};

existingFile.parse = function(arg, context) {
  return Promise.resolve(new Conversion(arg.text, arg));
};

existingFile.name = 'existingFile';


/**
 * Parent 'git' command
 */
var git = {
  name: 'git',
  description: 'Distributed revision control in a browser',
  manual: 'Git is a fast, scalable, distributed revision control system' +
    ' with an unusually rich command set that provides both' +
    ' high-level operations and full access to internals.'
};

/**
 * 'git add' command
 */
var gitAdd = {
  name: 'git add',
  description: 'Add file contents to the index',
  manual: 'This command updates the index using the current content found in the working tree, to prepare the content staged for the next commit. It typically adds the current content of existing paths as a whole, but with some options it can also be used to add content with only part of the changes made to the working tree files applied, or remove paths that do not exist in the working tree anymore.' +
      '<br/>The "index" holds a snapshot of the content of the working tree, and it is this snapshot that is taken as the contents of the next commit. Thus after making any changes to the working directory, and before running the commit command, you must use the add command to add any new or modified files to the index.' +
      '<br/>This command can be performed multiple times before a commit. It only adds the content of the specified file(s) at the time the add command is run; if you want subsequent changes included in the next commit, then you must run git add again to add the new content to the index.' +
      '<br/>The git status command can be used to obtain a summary of which files have changes that are staged for the next commit.' +
      '<br/>The git add command will not add ignored files by default. If any ignored files were explicitly specified on the command line, git add will fail with a list of ignored files. Ignored files reached by directory recursion or filename globbing performed by Git (quote your globs before the shell) will be silently ignored. The git add command can be used to add ignored files with the -f (force) option.' +
      '<br/>Please see git-commit(1) for alternative ways to add content to a commit.',
  params: [
    {
      name: 'filepattern',
      type: { name: 'array', subtype: 'string' },
      description: 'Files to add',
      manual: 'Fileglobs (e.g.  *.c) can be given to add all matching files. Also a leading directory name (e.g.  dir to add dir/file1 and dir/file2) can be given to add all files in the directory, recursively.'
    },
    {
      group: 'Common Options',
      params: [
        {
          name: 'all',
          short: 'a',
          type: 'boolean',
          description: 'All (unignored) files',
          manual: 'That means that it will find new files as well as staging modified content and removing files that are no longer in the working tree.'
        },
        {
          name: 'verbose',
          short: 'v',
          type: 'boolean',
          description: 'Verbose output'
        },
        {
          name: 'dry-run',
          short: 'n',
          type: 'boolean',
          description: 'Dry run',
          manual: 'Don\'t actually add the file(s), just show if they exist and/or will be ignored.'
        },
        {
          name: 'force',
          short: 'f',
          type: 'boolean',
          description: 'Allow ignored files',
          manual: 'Allow adding otherwise ignored files.'
        }
      ]
    },
    {
      group: 'Advanced Options',
      params: [
        {
          name: 'update',
          short: 'u',
          type: 'boolean',
          description: 'Match only files already added',
          manual: 'That means that it will never stage new files, but that it will stage modified new contents of tracked files and that it will remove files from the index if the corresponding files in the working tree have been removed.<br/>If no <filepattern> is given, default to "."; in other words, update all tracked files in the current directory and its subdirectories.'
        },
        {
          name: 'refresh',
          type: 'boolean',
          description: 'Refresh only (don\'t add)',
          manual: 'Don\'t add the file(s), but only refresh their stat() information in the index.'
        },
        {
          name: 'ignore-errors',
          type: 'boolean',
          description: 'Ignore errors',
          manual: 'If some files could not be added because of errors indexing them, do not abort the operation, but continue adding the others. The command shall still exit with non-zero status.'
        },
        {
          name: 'ignore-missing',
          type: 'boolean',
          description: 'Ignore missing',
          manual: 'By using this option the user can check if any of the given files would be ignored, no matter if they are already present in the work tree or not. This option can only be used together with --dry-run.'
        }
      ]
    }
  ],
  exec: function(args, context) {
    return "This is only a demo of UI generation.";
  }
};


/**
 * 'git commit' command
 */
var gitCommit = {
  name: 'git commit',
  description: 'Record changes to the repository',
  manual: 'Stores the current contents of the index in a new commit along with a log message from the user describing the changes.' +
      '<br/>The content to be added can be specified in several ways:' +
      '<br/>1. by using git add to incrementally "add" changes to the index before using the commit command (Note: even modified files must be "added");' +
      '<br/>2. by using git rm to remove files from the working tree and the index, again before using the commit command;' +
      '<br/>3. by listing files as arguments to the commit command, in which case the commit will ignore changes staged in the index, and instead record the current content of the listed files (which must already be known to git);' +
      '<br/>4. by using the -a switch with the commit command to automatically "add" changes from all known files (i.e. all files that are already listed in the index) and to automatically "rm" files in the index that have been removed from the working tree, and then perform the actual commit;' +
      '<br/>5. by using the --interactive switch with the commit command to decide one by one which files should be part of the commit, before finalizing the operation. Currently, this is done by invoking git add --interactive.' +
      '<br/>The --dry-run option can be used to obtain a summary of what is included by any of the above for the next commit by giving the same set of parameters (options and paths).' +
      '<br/>If you make a commit and then find a mistake immediately after that, you can recover from it with git reset.',
  params: [
    {
      name: 'file',
      short: 'F',
      type: { name: 'array', subtype: 'existingFile' },
      description: 'Files to commit',
      manual: 'When files are given on the command line, the command commits the contents of the named files, without recording the changes already staged. The contents of these files are also staged for the next commit on top of what have been staged before.'
    },
    {
      group: 'Common Options',
      params: [
        {
          name: 'all',
          short: 'a',
          type: 'boolean',
          description: 'All (unignored) files',
          manual: 'Tell the command to automatically stage files that have been modified and deleted, but new files you have not told git about are not affected.'
        },
        {
          name: 'message',
          short: 'm',
          type: 'string',
          description: 'Commit message',
          manual: 'Use the given message as the commit message.'
        },
        {
          name: 'signoff',
          short: 's',
          type: 'string',
          description: 'Signed off by',
          manual: 'Add Signed-off-by line by the committer at the end of the commit log message.'
        }
      ]
    },
    {
      group: 'Advanced Options',
      params: [
        {
          name: 'author',
          type: 'string',
          description: 'Override the author',
          manual: 'Specify an explicit author using the standard A U Thor <author@example.com[1]> format. Otherwise <author> is assumed to be a pattern and is used to search for an existing commit by that author (i.e. rev-list --all -i --author=<author>); the commit author is then copied from the first such commit found.'
        },
        {
          name: 'date',
          type: 'string', // Make this of date type
          description: 'Override the date',
          manual: 'Override the author date used in the commit.'
        },
        {
          name: 'amend',
          type: 'boolean',
          description: 'Amend tip',
          manual: 'Used to amend the tip of the current branch. Prepare the tree object you would want to replace the latest commit as usual (this includes the usual -i/-o and explicit paths), and the commit log editor is seeded with the commit message from the tip of the current branch. The commit you create replaces the current tip -- if it was a merge, it will have the parents of the current tip as parents -- so the current top commit is discarded.'
        },
        {
          name: 'verbose',
          short: 'v',
          type: 'boolean',
          description: 'Verbose',
          manual: 'Show unified diff between the HEAD commit and what would be committed at the bottom of the commit message template. Note that this diff output doesn\'t have its lines prefixed with #.'
        },
        {
          name: 'quiet',
          short: 'q',
          type: 'boolean',
          description: 'Quiet',
          manual: 'Suppress commit summary message.'
        },
        {
          name: 'dry-run',
          type: 'boolean',
          description: 'Dry run',
          manual: 'Do not create a commit, but show a list of paths that are to be committed, paths with local changes that will be left uncommitted and paths that are untracked.'
        },
        {
          name: 'untracked-files',
          short: 'u',
          type: {
            name: 'selection',
            data: [ 'no', 'normal', 'all' ]
          },
          description: 'Show untracked files',
          manual: 'The mode parameter is optional, and is used to specify the handling of untracked files. The possible options are: <em>no</em> - Show no untracked files.<br/><em>normal</em> Shows untracked files and directories<br/><em>all</em> Also shows individual files in untracked directories.'
        }
      ]
    }
  ],
  exec: function(args, context) {
    return "This is only a demo of UI generation.";
  }
};
