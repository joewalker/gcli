/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Skywriter.
 *
 * The Initial Developer of the Original Code is
 * Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Skywriter Team (skywriter@mozilla.com)
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

define(function(require, exports, module) {


var checks = require("pilot/typecheck");
var canon = require('pilot/canon');
var Type = require('pilot/types').Type;
var types = require('pilot/types');


/**
 * '!' command
 */
var gitCommandSpec = {
    name: 'git',
    description: 'Git is a fast, scalable, distributed revision control system with an unusually rich command set that provides both high-level operations and full access to internals.'
};

var gitAddCommandSpec = {
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
            name: 'dry-run',
            short: 'n',
            type: 'bool',
            description: 'Don\'t actually add the file(s), just show if they exist and/or will be ignored.'
        },
        {
            name: 'verbose',
            short: 'v',
            type: 'bool',
            description: 'Be verbose.'
        },
        {
            name: 'force',
            short: 'f',
            type: 'bool',
            description: 'Allow adding otherwise ignored files.'
        },
        {
            name: 'update',
            short: 'u',
            type: 'bool',
            description: 'Only match <em>filepattern</em> against already tracked files in the index rather than the working tree.',
            manual: 'That means that it will never stage new files, but that it will stage modified new contents of tracked files and that it will remove files from the index if the corresponding files in the working tree have been removed.<br/>If no <filepattern> is given, default to "."; in other words, update all tracked files in the current directory and its subdirectories.'
        },
        {
            name: 'all',
            short: 'A',
            type: 'bool',
            description: 'Like -u, but match <em>filepattern</em> against files in the working tree in addition to the index.',
            manual: 'That means that it will find new files as well as staging modified content and removing files that are no longer in the working tree.'
        },
        {
            name: 'intent-to-add',
            short: 'N',
            type: 'bool',
            description: 'Record only the fact that the path will be added later.',
            manual: 'An entry for the path is placed in the index with no content. This is useful for, among other things, showing the unstaged content of such files with git diff and committing them with git commit -a.'
        },
        {
            name: 'refresh',
            type: 'bool',
            description: 'Don\'t add the file(s), but only refresh their stat() information in the index.'
        },
        {
            name: 'ignore-errors',
            type: 'bool',
            description: 'If some files could not be added because of errors indexing them, do not abort the operation, but continue adding the others.',
            manual: 'The command shall still exit with non-zero status.'
        },
        {
            name: 'ignore-missing',
            type: 'bool',
            description: 'By using this option the user can check if any of the given files would be ignored, no matter if they are already present in the work tree or not.',
            manual: 'This option can only be used together with --dry-run.'
        },
        {
            name: 'filepattern',
            type: 'text[]',
            description: 'Files to add content from.',
            manual: 'Fileglobs (e.g.  *.c) can be given to add all matching files. Also a leading directory name (e.g.  dir to add dir/file1 and dir/file2) can be given to add all files in the directory, recursively.'
        }
    ],
    exec: function(env, args, request) {
        var req = new XMLHttpRequest();
        req.open('GET', '/exec?args=' + args.command, true);
        req.onreadystatechange = function(ev) {
          if (req.readyState == 4) {
            if (req.status == 200) {
              request.done('<pre>' + req.responseText + '</pre>');
            }
          }
        };
        req.send(null);
    }
};

/**
 * commitObject really needs some smarts, but for now it is a clone of string
 */
var commitObject = new Type();

commitObject.stringify = function(value) {
    return value;
};

commitObject.parse = function(value) {
    if (typeof value != 'string') {
        throw new Error('non-string passed to commitObject.parse()');
    }
    return new Conversion(value);
};

commitObject.name = 'commitObject';

/**
 * existingFile really needs some smarts, but for now it is a clone of string
 */
var existingFile = new Type();

existingFile.stringify = function(value) {
    return value;
};

existingFile.parse = function(value) {
    if (typeof value != 'string') {
        throw new Error('non-string passed to existingFile.parse()');
    }
    return new Conversion(value);
};

existingFile.name = 'existingFile';

var gitCommitCommandSpec = {
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
            name: 'all',
            short: 'a',
            type: 'bool',
            description: 'Tell the command to automatically stage files that have been modified and deleted, but new files you have not told git about are not affected.'
        },
        {
            name: 'reuse-message',
            short: 'C',
            type: 'commitObject',
            description: 'Take an existing commit object, and reuse the log message and the authorship information (including the timestamp) when creating the commit.'
        },
        {
            name: 'reset-author',
            type: 'bool',
            description: 'When used with --reuse-message/--amend options, declare that the authorship of the resulting commit now belongs of the committer. This also renews the author timestamp.'
        },
        {
            name: 'short',
            type: 'bool',
            description: 'When doing a dry-run, give the output in the short-format.',
            manual: 'See git-status(1) for details. Implies --dry-run.'
        },
        {
            name: 'porcelain',
            type: 'bool',
            description: 'When doing a dry-run, give the output in a porcelain-ready format.',
            manual: 'See git-status(1) for details. Implies --dry-run.'
        },
        {
            name: 'terminate-nul',
            short: 'z',
            type: 'bool',
            description: 'When showing short or porcelain status output, terminate entries in the status output with NUL, instead of LF.',
            manual: 'If no format is given, implies the --porcelain output format.'
        },
        {
            name: 'file',
            short: 'F',
            type: 'existingFile',
            description: 'Take the commit message from the given file.',
            manual: ''
        },
        {
            name: 'author',
            type: 'text',
            description: 'Override the commit author.',
            manual: 'Specify an explicit author using the standard A U Thor <author@example.com[1]> format. Otherwise <author> is assumed to be a pattern and is used to search for an existing commit by that author (i.e. rev-list --all -i --author=<author>); the commit author is then copied from the first such commit found.'
        },
        {
            name: 'date',
            type: 'text', // TODO: Make this of text type
            description: 'Override the author date used in the commit.'
        },
        {
            name: 'message',
            short: 'm',
            type: 'text',
            description: 'Use the given message as the commit message.'
        },
        /*
        {
            name: 'template',
            short: 't',
            type: 'existingFile',
            description: 'Use the contents of the given file as the initial version of the commit message.',
            manual: 'The editor is invoked and you can make subsequent changes. If a message is specified using the -m or -F options, this option has no effect. This overrides the commit.template configuration variable.'
        },
        */
        {
            name: 'signoff',
            short: 's',
            type: 'bool',
            description: 'Add Signed-off-by line by the committer at the end of the commit log message.'
        },
        {
            name: 'no-verify',
            short: 'n',
            type: 'bool',
            description: 'This option bypasses the pre-commit and commit-msg hooks. See also githooks(5).'
        },
        {
            name: 'cleanup',
            type: {
                name: 'selection',
                data: [ 'verbatim', 'whitespace', 'strip', 'default' ]
            },
            description: 'This option sets how the commit message is cleaned up.',
            manual: 'The <em>default</em> mode will strip leading and trailing empty lines and commentary from the commit message only if the message is to be edited. Otherwise only whitespace removed. The <em>verbatim</em> mode does not change message at all, <em>whitespace</em> removes just leading/trailing whitespace lines and <em>strip</em> removes both whitespace and commentary.'
        },
        {
            name: 'amend',
            type: 'bool',
            description: 'Used to amend the tip of the current branch.',
            manual: 'Prepare the tree object you would want to replace the latest commit as usual (this includes the usual -i/-o and explicit paths), and the commit log editor is seeded with the commit message from the tip of the current branch. The commit you create replaces the current tip -- if it was a merge, it will have the parents of the current tip as parents -- so the current top commit is discarded.'
        },
        {
            name: 'include',
            short: 'i',
            type: 'bool',
            description: 'Before making a commit out of staged contents so far, stage the contents of paths given on the command line as well.',
            manual: 'This is usually not what you want unless you are concluding a conflicted merge.'
        },
        {
            name: 'only',
            short: 'o',
            type: 'bool',
            description: 'Make a commit only from the paths specified on the command line, disregarding any contents that have been staged so far.',
            manual: 'This is the default mode of operation of git commit if any paths are given on the command line, in which case this option can be omitted. If this option is specified together with --amend, then no paths need to be specified, which can be used to amend the last commit without committing changes that have already been staged.'
        },
        {
            name: 'untracked-files',
            short: 'u',
            type: {
                name: 'selection',
                data: [ 'no', 'normal', 'all' ]
            },
            description: 'Show untracked files (Default: all).',
            manual: 'The mode parameter is optional, and is used to specify the handling of untracked files. The possible options are: <em>no</em> - Show no untracked files.<br/><em>normal</em> Shows untracked files and directories<br/><em>all</em> Also shows individual files in untracked directories.'
        },
        {
            name: 'verbose',
            short: 'v',
            type: 'bool',
            description: 'Show unified diff between the HEAD commit and what would be committed at the bottom of the commit message template.',
            manual: 'Note that this diff output doesn\'t have its lines prefixed with #.'
        },
        {
            name: 'quiet',
            short: 'q',
            type: 'bool',
            description: 'Suppress commit summary message.'
        },
        {
            name: 'dry-run',
            type: 'bool',
            description: 'Do not create a commit, but show a list of paths that are to be committed, paths with local changes that will be left uncommitted and paths that are untracked.'
        },
        {
            name: 'status',
            type: 'bool',
            description: 'Include the output of git-status(1) in the commit message template when using an editor to prepare the commit message.',
            manual: 'Defaults to on, but can be used to override configuration variable commit.status.'
        },
        {
            name: 'no-status',
            type: 'bool',
            description: 'Do not include the output of git-status(1) in the commit message template when using an editor to prepare the default commit message.'
        },
        {
            name: 'file',
            type: 'existingFile[]',
            description: 'When files are given on the command line, the command commits the contents of the named files, without recording the changes already staged.',
            manual: 'The contents of these files are also staged for the next commit on top of what have been staged before.'
        }
    ],
    exec: function(env, args, request) {
    }
};


var commands = [
    gitCommandSpec,
    gitAddCommandSpec,
    gitCommitCommandSpec
];

var canon = require('pilot/canon');

exports.startup = function(data, reason) {
    types.registerType(commitObject);
    types.registerType(existingFile);
    commands.forEach(function(command) {
        canon.addCommand(command);
    }, this);
};

exports.shutdown = function(data, reason) {
    commands.forEach(function(command) {
        canon.removeCommand(command);
    }, this);
    types.unregisterType(commitObject);
    types.unregisterType(existingFile);
};


});
