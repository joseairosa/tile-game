// Created by: José P. Airosa for facebook puzzle code test #1
// Email: me@joseairosa.com

// Our abstracted scope
(function () {

    // Make sure we don't load our game environment more than once
    if (window.TG) return;

    // Initialize our Tile Game (TG) main object
    window.TG = {};

    // Tile matrix. We initialize it empty to make the size of the matrix dynamic
    var tm = [];
    // Storing all original indexes for faster position retrieval
    var tm_position_cache = [];
    // Number of tiles on both axis
    var tm_size = {x:4, y:4};
    // Initialize container for tile sizes that will be calculated on TG.init
    var tile_size = {w:0, h:0};
    // Size of the background image
    var image_size = {w:540, h:540};
    // Drag flag
    var is_being_dragged = false;
    // Gameboard css selector (noramlly its ID)
    var gb_selector = "";
    // Global container for the current move instructions
    var move_instructions = {};
    // Plays counter
    var plays_counter = 0;

    /**
     * Initialize our environment and position the tiles in a random position (shuffle)
     *
     * @param   string  element id where our game board should be generated
     */
    TG.init = function (e) {
        gb_selector = "#" + e;

        // Calculate the width and height based on the image width and height and number of tiles on the x and y axis
        tile_size.w = (image_size.w / tm_size.x);
        tile_size.h = (image_size.h / tm_size.y);

        TG.fillMatrix();
        TG.renderBoard(e);
        TG.shuffleTiles();
    };

    /**
     * Iterate through all the tiles in the board and runs a user provided callback
     *
     * @param   fn  user provided callback.
     *              to this callback 3 arguments are provided:
     *                  index - the index of the tile position on the game board
     *                  jj - x axis position
     *                  ii - y axis position
     */
    TG.iterate = function (fn) {
        var index = 0;
        // We change the axis here because I want to go over the x axis first and then iterate the y axis
        for (var ii = 0; ii < tm_size.y; ii++) {
            for (var jj = 0; jj < tm_size.x; jj++) {
                fn(index, jj, ii);
                index++;
            }
        }
    };

    /**
     * Fills the tile matrix with default values. Should be only used on TG.init()
     *
     */
    TG.fillMatrix = function () {
        TG.iterate(function (index, x, y) {
            tm_position_cache.push({x:(x * tile_size.w), y:(y * tile_size.h)});
            tm.push(index);
        });
    };

    /**
     * Shuffles the tile matrix.
     * Used the Fisher-Yates randomizing shuffle algorithm.
     *
     * @return  bool False if the tile matrix is empty.
     */
    TG.shuffleTiles = function () {
        var i = tm.length;
        if (i == 0) return false;
        while (--i) {
            var j = Math.floor(Math.random() * ( i + 1 ));
            var tempi = tm[i];
            var tempj = tm[j];
            tm[i] = tempj;
            tm[j] = tempi;
        }

        // Apply the shuffled board and set the tiles
        for (var ii = 0; ii < tm.length; ii++) {
            axis = TG.getPositionReference(tm.indexOf(ii));
            $('div[tile="' + ii + '"]').css({
                left:axis.x,
                top:axis.y
            });
        }
        return true;
    };

    /**
     * Renders the board onto the element specified on the init method
     */
    TG.renderBoard = function () {

        // Hide our board while we add the tiles and apply the pre-processed shuffle
        $(gb_selector).css("display", "none").width(image_size.w).height(image_size.h);

        // Render
        TG.iterate(function (index, x, y) {
            var new_tile = $("<div></div>")
                .attr({tile:index})
                .width(tile_size.w)
                .height(tile_size.h);
            $(gb_selector).append(new_tile);
            // Make sure we don't fill the last tile as it will be our freespace
            if (index != (tm_size.x * tm_size.y) - 1) {
                var background_position = (x == 0 && y == 0 ? "0px 0px" : "-" + (tile_size.h * y) + "px -" + (tile_size.w * x) + "px");
                new_tile.css({
                    backgroundPosition:background_position,
                    left:(x * tile_size.w) + "px",
                    top:(y * tile_size.h) + "px"
                }).addClass("tiles tile");
            } else {
                // Add our whitespace
                new_tile.css({
                    left:((tm_size.x - 1) * tile_size.w) + "px",
                    top:((tm_size.y - 1) * tile_size.h) + "px"
                }).addClass("no-tile");
            }
        });

        var moved_on_x = 0;
        var moved_on_y = 0;

        // Add callbacks to each of the tiles
        $(".tiles")
            .mousedown(function (md_e) {

                moved_on_x = 0;
                moved_on_y = 0;

                is_being_dragged = true;

                move_instructions = TG.getMoveInstructions($(this).attr("tile"));

                if (move_instructions != false) {
                    // Bind a mousemove event onto our gameboard to get access to the mouse coordinates inside it
                    $(gb_selector).bind('mousemove.move_tile', function (mm_e) {

                        TG.executeMove(function (index, instruction) {
                            // Get the position to where this tile needs to move to
                            var initial_position = TG.getPositionReference(instruction.i);

                            // Calculate the movement of the tiles
                            moved_on_x = (mm_e.pageX - md_e.pageX);
                            moved_on_y = (mm_e.pageY - md_e.pageY);

                            var p = {
                                x:instruction.a == "y" ? initial_position.x : initial_position.x + (moved_on_x),
                                y:instruction.a == "x" ? initial_position.y : initial_position.y + (moved_on_y)
                            };

                            // Make sure the user is not able to move the tile in the wrong direction and more than he
                            // is able to, normally, more than one gap
                            if (instruction.a == "x" && instruction.d < 0 && p.x > initial_position.x) p.x = initial_position.x;
                            else if (instruction.a == "x" && instruction.d > 0 && p.x < initial_position.x) p.x = initial_position.x;
                            else if (instruction.a == "x" && instruction.d < 0 && Math.abs(moved_on_x) > tile_size.w) p.x = initial_position.x - tile_size.w;
                            else if (instruction.a == "x" && instruction.d > 0 && Math.abs(moved_on_x) > tile_size.w) p.x = initial_position.x + tile_size.w;

                            if (instruction.a == "y" && instruction.d < 0 && p.y > initial_position.y) p.y = initial_position.y;
                            else if (instruction.a == "y" && instruction.d > 0 && p.y < initial_position.y) p.y = initial_position.y;
                            else if (instruction.a == "y" && instruction.d < 0 && Math.abs(moved_on_y) > tile_size.h) p.y = initial_position.y - tile_size.h;
                            else if (instruction.a == "y" && instruction.d > 0 && Math.abs(moved_on_y) > tile_size.h) p.y = initial_position.y + tile_size.h;


                            // Make sure the user is not able to move the tile outside gameboard limits
                            if (p.x >= image_size.w - tile_size.w) p.x = image_size.w - tile_size.w;
                            if (p.y >= image_size.h - tile_size.h) p.y = image_size.h - tile_size.h;
                            if (p.x <= 0) p.x = 0;
                            if (p.y <= 0) p.y = 0;

                            // Animate the tile to its new position
                            $('div[tile="' + tm[instruction.i] + '"]').css({
                                top:p.y,
                                left:p.x
                            });
                        });

                    });
                }
            })
            .mouseup(function (mu_e) {
                if (move_instructions != false) {
                    var valid_move = false;
                    TG.executeMove(function (index, instruction) {
                        if ((instruction.a == "x" && Math.abs(moved_on_x) < (tile_size.w / 2) && Math.abs(moved_on_x) > 0) || (instruction.a == "y" && Math.abs(moved_on_y) < (tile_size.h / 2) && Math.abs(moved_on_y) > 0)) {
                            // Get tile inital position
                            var initial_position = TG.getPositionReference(instruction.i);
                            // Animate the tile to its initial position
                            $('div[tile="' + tm[instruction.i] + '"]').animate({
                                top:initial_position.y,
                                left:initial_position.x
                            }, 100);
                        } else {
                            valid_move = true;
                            // Get the position to where this tile needs to move to
                            var move_to = TG.getPositionReference(instruction.to_i);
                            // Animate the tile to its new position
                            $('div[tile="' + tm[instruction.i] + '"]').animate({
                                top:move_to.y,
                                left:move_to.x
                            }, 100);
                            // Swap indexes on the tile matrix
                            var tmp = tm[instruction.to_i];
                            tm[instruction.to_i] = tm[instruction.i];
                            tm[instruction.i] = tmp;
                        }
                    });
                    // Only if we have a valid move we should update the play counter
                    if(valid_move) TG.addToPlayCount();
                    // Unbind the mousemove event as we don't need it anymore. It's always a good idea to clean the house
                    // after the party!
                    $(gb_selector).unbind('mousemove.move_tile');
                    TG.checkGameOver();
                }
                is_being_dragged = false;
            });

        // Show our board again
        $(gb_selector).css("display", "block");
    };

    /**
     * Adds a play count and outputs it onto the game counter container element
     */
    TG.addToPlayCount = function () {
        var o = $("#gameCounter");
        // If we actually have a game counter specified.
        if (o.length > 0) {
            plays_counter++;
            o.html(plays_counter + (plays_counter == 1 ? " play" : " plays"));
        }
    }

    /**
     * Check if we have completed our game by aligning our tile matrix.
     * In order for us to know that the game is over the tile matrix should be filled with indexes in a sequecial order
     *
     * @return  bool    True if the game is over and false if not
     */
    TG.checkGameOver = function () {
        var index = 0;
        for (var key in tm) {
            if (index != tm[key]) {
                return false;
            }
            index++;
        }
        $(gb_selector)
            .append(
            $("<div></div>").css({
                position:"absolute",
                backgroundColor:"#fff",
                opacity:.8,
                zIndex:3
            })
                .width(image_size.w)
                .height(image_size.h)
        )
            .append(
            $("<div></div>")
                .css({
                    position:"absolute",
                    top:"180px",
                    left:"60px",
                    zIndex:4
                })
                .html('<div style="float:left;"><img src="assets/img/f_logo.png" width="140" height="140" title="Facebook" alt="Game Over - Congratulations"/></div><div style="float:right;margin-left:30px;"><h1>Congratulations!</h1><br/>You just finished the game!</div>')
        );
        return true;
    };

    /**
     * For a given index get the tile position
     *
     * @param   int The index for which position we want to get the coordinates
     * @return  object  with the x and y coordinates
     */
    TG.getPositionReference = function (index) {
        return tm_position_cache[index];
    };

    /**
     * Return the index of the tile from its current axis
     *
     * @param   int the x axis position
     * @param   int the y axis position
     * @return  int the index
     */
    TG.getIndexReferenceByAxis = function (x, y) {
        return y * tm_size.x + x;
    };

    /**
     * Get the position of the white space
     *
     * @return object  with the x and y coordinates
     */
    TG.getBlankSpot = function () {
        return TG.getPositionReference(tm.indexOf(tm.length - 1));
    };

    /**
     * For a given x axis tile position get the corresponding index
     *
     * @example 135px -> index 1
     *
     * @param   int x axis position
     * @return  int index
     */
    TG.getTileReferenceFromX = function (axis) {
        return (parseInt(axis) / parseInt(tile_size.w));
    };

    /**
     * For a given y axis tile position get the corresponding index
     *
     * @example 135px -> index 1
     *
     * @param   int y axis position
     * @return  int index
     */
    TG.getTileReferenceFromY = function (axis) {
        return (parseInt(axis) / parseInt(tile_size.h));
    };

    /**
     * Make a tile move based on the move instructions previously set
     *
     * @param   method  the callback to execute on every tile that needs to move
     *                  2 parameters will be provided to the callback:
     *                      key - the index of instruction object array
     *                      move_instructions - the instructions for a specific tile
     */
    TG.executeMove = function (fn) {
        if (move_instructions != false) {
            for (var key in move_instructions) {
                fn(key, move_instructions[key]);
            }
        }
    };

    /**
     * From a given interacted index calculate all the movements
     *
     * @param   int             the index that was interacted for movement
     * @return  array|bool      if false this is an illigal move
     *                          if array we have a move instructions object array
     */
    TG.getMoveInstructions = function (i) {

        var index = tm.indexOf(parseInt(i));
        clicked_ref = TG.getPositionReference(index);
        blank_ref = TG.getBlankSpot();

        is_x_move = !!(clicked_ref.y == blank_ref.y);
        is_y_move = !!(clicked_ref.x == blank_ref.x);

        // Check if this is an illigal move
        // If illigal we should return false
        if ((!is_x_move && !is_y_move) || (is_x_move && is_y_move)) {
            return false;
        }

        move_to_right = !!(clicked_ref.x - blank_ref.x < 0);
        move_to_bottom = !!(clicked_ref.y - blank_ref.y < 0);

        var clicked_ref_x = TG.getTileReferenceFromY(clicked_ref.x);
        var clicked_ref_y = TG.getTileReferenceFromY(clicked_ref.y);
        var blank_ref_x = TG.getTileReferenceFromY(blank_ref.x);
        var blank_ref_y = TG.getTileReferenceFromY(blank_ref.y);

        // Check if this is a x axis move
        tmp_array_move = [];
        if (is_x_move) {
            if (move_to_right) {
                for (var ii = clicked_ref_x; ii < blank_ref_x; ii++) {
                    tmp_array_move.push({
                        a:"x",
                        d:1,
                        i:TG.getIndexReferenceByAxis(ii, clicked_ref_y),
                        to_i:TG.getIndexReferenceByAxis(ii + 1, clicked_ref_y),
                        x:ii,
                        y:clicked_ref_y,
                        to_x:ii + 1,
                        to_y:clicked_ref_y
                    });
                }
            } else {
                for (var ii = TG.getTileReferenceFromX(clicked_ref.x); ii > TG.getTileReferenceFromX(blank_ref.x); ii--) {
                    tmp_array_move.push({
                        a:"x",
                        d:-1,
                        i:TG.getIndexReferenceByAxis(ii, clicked_ref_y),
                        to_i:TG.getIndexReferenceByAxis(ii - 1, clicked_ref_y),
                        x:ii,
                        y:clicked_ref_y,
                        to_x:ii - 1,
                        to_y:clicked_ref_y
                    });
                }
            }
        }
        // Check if this is a y axis move
        else if (is_y_move) {
            if (move_to_bottom) {
                for (var ii = clicked_ref_y; ii < blank_ref_y; ii++) {
                    tmp_array_move.push({
                        a:"y",
                        d:1,
                        i:TG.getIndexReferenceByAxis(clicked_ref_x, ii),
                        to_i:TG.getIndexReferenceByAxis(clicked_ref_x, ii + 1),
                        x:clicked_ref_x,
                        y:ii,
                        to_x:clicked_ref_x,
                        to_y:ii + 1
                    });
                }
            } else {
                for (var ii = clicked_ref_y; ii > blank_ref_y; ii--) {
                    tmp_array_move.push({
                        a:"y",
                        d:-1,
                        i:TG.getIndexReferenceByAxis(clicked_ref_x, ii),
                        to_i:TG.getIndexReferenceByAxis(clicked_ref_x, ii - 1),
                        x:clicked_ref_x,
                        y:ii,
                        to_x:clicked_ref_x,
                        to_y:ii - 1
                    });
                }
            }
        } else {
            return false
        }

        return tmp_array_move.reverse();
    };

})();